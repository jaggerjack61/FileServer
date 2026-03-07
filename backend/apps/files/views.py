import logging
import mimetypes
import os
import tempfile
import zipfile
from pathlib import PurePosixPath

from django.conf import settings
from django.core.files import File as DjangoFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api_keys.permissions import HasTenantAPIKey
from apps.folders.models import Folder
from apps.tenants.models import Tenant

from .models import File
from .office import get_office_editor_kind, load_office_content, save_office_content
from .serializers import (
    FileBulkDestinationSerializer,
    FileCompressSerializer,
    FileContentUpdateSerializer,
    FileExtractSerializer,
    FileMoveSerializer,
    FileOfficeContentSerializer,
    FileRenameSerializer,
    FileSerializer,
    FileUploadSerializer,
)
from .services import get_storage_service, start_thumbnail_generation_thread

logger = logging.getLogger(__name__)


def _get_tenant(request):
    """Return the tenant scoped to the current request (JWT or API‑key)."""
    if hasattr(request, "tenant"):
        return request.tenant
    if request.user and request.user.is_authenticated and request.user.tenant:
        return request.user.tenant
    return None


class FileUploadView(APIView):
    """POST /api/files/upload/"""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        serializer = FileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = serializer.validated_data["file"]
        folder_id = serializer.validated_data.get("folder_id")

        # Validate folder belongs to tenant
        parent_folder = None
        folder_path = ""
        if folder_id:
            try:
                parent_folder = Folder.objects.get(id=folder_id, tenant=tenant)
                folder_path = _build_folder_path(parent_folder)
            except Folder.DoesNotExist:
                return Response({"detail": "Folder not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check storage quota
        if tenant.storage_used + uploaded_file.size > tenant.storage_quota:
            return Response(
                {"detail": "Storage quota exceeded."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        # Determine MIME type
        content_type = uploaded_file.content_type or mimetypes.guess_type(uploaded_file.name)[0] or "application/octet-stream"

        # Persist to storage
        storage = get_storage_service()
        user_id = str(request.user.id) if request.user.is_authenticated else "apikey"
        storage_path = storage.save_file(uploaded_file, str(tenant.id), user_id, folder_path)

        # Create DB record
        file_obj = File.objects.create(
            tenant=tenant,
            owner=request.user if request.user.is_authenticated else tenant.owner,
            filename=uploaded_file.name,
            original_filename=uploaded_file.name,
            file_size=uploaded_file.size,
            file_type=content_type,
            storage_path=storage_path,
            parent_folder=parent_folder,
        )

        # Update tenant storage
        tenant.storage_used += uploaded_file.size
        tenant.save(update_fields=["storage_used"])

        start_thumbnail_generation_thread(str(file_obj.id))

        logger.info("File uploaded: %s by user %s", file_obj.filename, request.user)

        return Response(FileSerializer(file_obj, context={"request": request}).data, status=status.HTTP_201_CREATED)


class FileListView(APIView):
    """GET /api/files/"""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def get(self, request):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        qs = File.objects.filter(tenant=tenant, is_deleted=False).select_related("owner")

        # Filters
        folder_id = request.query_params.get("folder_id")
        if folder_id:
            qs = qs.filter(parent_folder_id=folder_id)
        else:
            # When no folder specified, return root-level files
            qs = qs.filter(parent_folder__isnull=True)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(filename__icontains=search)

        ordering = request.query_params.get("ordering", "-created_at")
        allowed_orderings = ["created_at", "-created_at", "filename", "-filename", "file_size", "-file_size"]
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)

        # Simple pagination
        from rest_framework.pagination import PageNumberPagination

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)
        serializer = FileSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class FileDetailView(APIView):
    """GET /api/files/{id}/ and DELETE /api/files/{id}/"""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def get(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)
        try:
            file_obj = File.objects.select_related("owner").get(id=pk, tenant=tenant, is_deleted=False)
        except File.DoesNotExist:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(FileSerializer(file_obj, context={"request": request}).data)

    def delete(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)
        try:
            file_obj = File.objects.get(id=pk, tenant=tenant, is_deleted=False)
        except File.DoesNotExist:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        # Soft delete
        file_obj.is_deleted = True
        file_obj.save(update_fields=["is_deleted", "updated_at"])

        # Update tenant storage
        tenant.storage_used = max(0, tenant.storage_used - file_obj.file_size)
        tenant.save(update_fields=["storage_used"])

        logger.info("File soft-deleted: %s by user %s", file_obj.filename, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class FileRenameView(APIView):
    """PUT /api/files/{id}/rename/"""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def put(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)
        try:
            file_obj = File.objects.select_related("owner").get(id=pk, tenant=tenant, is_deleted=False)
        except File.DoesNotExist:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = FileRenameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        file_obj.filename = serializer.validated_data["filename"]
        file_obj.save(update_fields=["filename", "updated_at"])

        logger.info("File renamed: %s -> %s", pk, file_obj.filename)
        return Response(FileSerializer(file_obj, context={"request": request}).data)


class FileContentUpdateView(APIView):
    """PUT /api/files/{id}/content/"""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def put(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        try:
            file_obj = File.objects.select_related("owner").get(id=pk, tenant=tenant, is_deleted=False)
        except File.DoesNotExist:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        if not _is_text_editable_file(file_obj.file_type, file_obj.original_filename):
            return Response(
                {"detail": "This file type cannot be edited in the browser."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FileContentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        encoded_content = serializer.validated_data["content"].encode("utf-8")
        size_delta = len(encoded_content) - file_obj.file_size
        if size_delta > 0 and tenant.storage_used + size_delta > tenant.storage_quota:
            return Response(
                {"detail": "Storage quota exceeded."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        storage = get_storage_service()
        new_size = storage.update_file(file_obj.storage_path, encoded_content)
        if new_size != file_obj.file_size:
            tenant.storage_used = max(0, tenant.storage_used + (new_size - file_obj.file_size))
            tenant.save(update_fields=["storage_used"])

        file_obj.file_size = new_size
        file_obj.save(update_fields=["file_size", "updated_at"])

        logger.info("File content updated: %s by user %s", file_obj.filename, request.user)
        return Response(FileSerializer(file_obj, context={"request": request}).data)


class FileOfficeContentView(APIView):
    """GET/PUT /api/files/{id}/office-content/"""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def get(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        try:
            file_obj = File.objects.select_related("owner").get(id=pk, tenant=tenant, is_deleted=False)
        except File.DoesNotExist:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        if not get_office_editor_kind(file_obj.file_type, file_obj.original_filename):
            return Response(
                {"detail": "This file type is not supported for local office editing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_preview_size = getattr(settings, "OFFICE_PREVIEW_MAX_FILE_SIZE", 20971520)
        if file_obj.file_size > max_preview_size:
            limit_mb = max_preview_size / (1024 * 1024)
            return Response(
                {"detail": f"File is too large for document preview (limit: {limit_mb:.0f} MB)."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        storage = get_storage_service()
        raw_bytes = storage.read_file_bytes(file_obj.storage_path)

        try:
            content = load_office_content(file_obj.file_type, file_obj.original_filename, raw_bytes)
        except Exception as exc:
            logger.warning("Unable to load office content for %s: %s", file_obj.id, exc)
            return Response({"detail": "Unable to load office content for this file."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"content": content})

    def put(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        try:
            file_obj = File.objects.select_related("owner").get(id=pk, tenant=tenant, is_deleted=False)
        except File.DoesNotExist:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        if not get_office_editor_kind(file_obj.file_type, file_obj.original_filename):
            return Response(
                {"detail": "This file type is not supported for local office editing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FileOfficeContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        storage = get_storage_service()
        current_bytes = storage.read_file_bytes(file_obj.storage_path)

        try:
            updated_bytes = save_office_content(
                file_obj.file_type,
                file_obj.original_filename,
                current_bytes,
                serializer.validated_data["content"],
            )
        except Exception as exc:
            logger.warning("Unable to save office content for %s: %s", file_obj.id, exc)
            return Response({"detail": "Unable to save office content for this file."}, status=status.HTTP_400_BAD_REQUEST)

        size_delta = len(updated_bytes) - file_obj.file_size
        if size_delta > 0 and tenant.storage_used + size_delta > tenant.storage_quota:
            return Response(
                {"detail": "Storage quota exceeded."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        new_size = storage.update_file(file_obj.storage_path, updated_bytes)
        if new_size != file_obj.file_size:
            tenant.storage_used = max(0, tenant.storage_used + (new_size - file_obj.file_size))
            tenant.save(update_fields=["storage_used"])

        file_obj.file_size = new_size
        file_obj.save(update_fields=["file_size", "updated_at"])

        logger.info("Office content updated: %s by user %s", file_obj.filename, request.user)
        return Response(FileSerializer(file_obj, context={"request": request}).data)


class FileDownloadView(APIView):
    """GET /api/files/{id}/download/"""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def get(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)
        try:
            file_obj = File.objects.get(id=pk, tenant=tenant, is_deleted=False)
        except File.DoesNotExist:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        storage = get_storage_service()
        from django.conf import settings as django_settings

        if getattr(django_settings, "STORAGE_BACKEND", "local") == "s3":
            # Return presigned URL redirect
            url = storage.get_file(file_obj.storage_path)
            return Response({"download_url": url})

        # Local: stream the file
        file_path = storage.get_file(file_obj.storage_path)
        if file_path is None:
            raise Http404("File not found on disk.")

        response = FileResponse(
            open(file_path, "rb"),
            content_type=file_obj.file_type,
        )
        response["Content-Disposition"] = f'attachment; filename="{file_obj.filename}"'
        return response


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _build_folder_path(folder: Folder) -> str:
    """Build a slash-separated path by walking up the parent chain."""
    parts = []
    current = folder
    while current:
        parts.append(str(current.id))
        current = current.parent
    parts.reverse()
    return "/".join(parts)


def _get_request_owner(request, tenant: Tenant):
    return request.user if request.user.is_authenticated else tenant.owner


def _get_request_user_id(request) -> str:
    return str(request.user.id) if request.user.is_authenticated else "apikey"


def _resolve_folder(tenant: Tenant, folder_id):
    if folder_id in (None, ""):
        return None
    try:
        return Folder.objects.get(id=folder_id, tenant=tenant)
    except Folder.DoesNotExist as exc:
        raise Folder.DoesNotExist("Target folder not found.") from exc


def _folder_path(folder: Folder | None) -> str:
    return _build_folder_path(folder) if folder else ""


def _default_archive_name(files: list[File]) -> str:
    if len(files) == 1:
        stem, _ = os.path.splitext(files[0].original_filename)
        base_name = stem or files[0].original_filename or "archive"
    else:
        base_name = f"archive-{timezone.now():%Y%m%d-%H%M%S}"
    return f"{base_name}.zip"


def _is_text_editable_file(file_type: str, filename: str) -> bool:
    normalized_type = (file_type or "").lower()
    normalized_name = (filename or "").lower()
    editable_extensions = {
        ".txt",
        ".md",
        ".markdown",
        ".json",
        ".xml",
        ".html",
        ".htm",
        ".css",
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".csv",
        ".yml",
        ".yaml",
        ".ini",
        ".log",
        ".py",
        ".java",
        ".c",
        ".cpp",
        ".h",
        ".hpp",
        ".sh",
        ".sql",
    }

    return (
        normalized_type.startswith("text/")
        or "json" in normalized_type
        or "xml" in normalized_type
        or "javascript" in normalized_type
        or "ecmascript" in normalized_type
        or "yaml" in normalized_type
        or PurePosixPath(normalized_name).suffix in editable_extensions
    )


def _normalize_archive_name(name: str | None, files: list[File]) -> str:
    candidate = (name or "").strip() or _default_archive_name(files)
    if not candidate.lower().endswith(".zip"):
        candidate = f"{candidate}.zip"
    return candidate[:255]


def _dedupe_archive_member_name(filename: str, seen: set[str]) -> str:
    candidate = filename
    stem, ext = os.path.splitext(filename)
    index = 1
    while candidate in seen:
        candidate = f"{stem} ({index}){ext}"
        index += 1
    seen.add(candidate)
    return candidate


def _ensure_unique_folder_name(tenant: Tenant, parent: Folder | None, base_name: str) -> str:
    cleaned = (base_name or "Extracted").strip() or "Extracted"
    candidate = cleaned[:255]
    if not Folder.objects.filter(tenant=tenant, parent=parent, name=candidate).exists():
        return candidate

    suffix = 1
    while True:
        suffix_text = f" ({suffix})"
        trimmed = cleaned[: max(1, 255 - len(suffix_text))]
        candidate = f"{trimmed}{suffix_text}"
        if not Folder.objects.filter(tenant=tenant, parent=parent, name=candidate).exists():
            return candidate
        suffix += 1


def _sanitize_archive_member(member_name: str) -> tuple[str, ...] | None:
    path = PurePosixPath(member_name)
    if path.is_absolute():
        return None

    parts = tuple(part for part in path.parts if part not in ("", "."))
    if not parts or any(part == ".." for part in parts):
        return None
    if parts[0].startswith("__MACOSX"):
        return None
    return parts


def _get_or_create_nested_folder(
    folder_cache: dict[tuple[str, ...], Folder],
    tenant: Tenant,
    owner,
    root_folder: Folder,
    parts: tuple[str, ...],
) -> Folder:
    current_parts: list[str] = []
    parent = root_folder

    for part in parts:
        current_parts.append(part)
        key = tuple(current_parts)
        existing = folder_cache.get(key)
        if existing is not None:
            parent = existing
            continue

        folder, _ = Folder.objects.get_or_create(
            tenant=tenant,
            parent=parent,
            name=part[:255],
            defaults={"owner": owner},
        )
        folder_cache[key] = folder
        parent = folder

    return parent


class TrashListView(APIView):
    """GET /api/files/trash/ – list soft-deleted files."""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def get(self, request):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        qs = File.objects.filter(tenant=tenant, is_deleted=True).select_related("owner")

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(filename__icontains=search)

        qs = qs.order_by("-updated_at")

        from rest_framework.pagination import PageNumberPagination

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)
        serializer = FileSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class TrashRestoreView(APIView):
    """POST /api/files/trash/{id}/restore/ – restore a deleted file."""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def post(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)
        try:
            file_obj = File.objects.get(id=pk, tenant=tenant, is_deleted=True)
        except File.DoesNotExist:
            return Response({"detail": "File not found in trash."}, status=status.HTTP_404_NOT_FOUND)

        # Check storage quota
        if tenant.storage_used + file_obj.file_size > tenant.storage_quota:
            return Response(
                {"detail": "Storage quota exceeded. Cannot restore file."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        file_obj.is_deleted = False
        file_obj.save(update_fields=["is_deleted", "updated_at"])

        tenant.storage_used += file_obj.file_size
        tenant.save(update_fields=["storage_used"])

        logger.info("File restored from trash: %s by user %s", file_obj.filename, request.user)
        return Response(FileSerializer(file_obj, context={"request": request}).data)


class BulkDeleteView(APIView):
    """POST /api/files/bulk-delete/ – soft-delete multiple files."""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def post(self, request):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        file_ids = request.data.get("file_ids", [])
        if not file_ids or not isinstance(file_ids, list):
            return Response({"detail": "file_ids list is required."}, status=status.HTTP_400_BAD_REQUEST)

        files = File.objects.filter(id__in=file_ids, tenant=tenant, is_deleted=False)
        total_freed = sum(f.file_size for f in files)
        count = files.update(is_deleted=True)

        if total_freed:
            tenant.storage_used = max(0, tenant.storage_used - total_freed)
            tenant.save(update_fields=["storage_used"])

        logger.info("Bulk deleted %d files by user %s", count, request.user)
        return Response({"deleted": count})


class BulkMoveView(APIView):
    """POST /api/files/bulk-move/ – move multiple files to a folder."""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def post(self, request):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        file_ids = request.data.get("file_ids", [])
        folder_id = request.data.get("folder_id")  # None means root

        if not file_ids or not isinstance(file_ids, list):
            return Response({"detail": "file_ids list is required."}, status=status.HTTP_400_BAD_REQUEST)

        target_folder = None
        if folder_id:
            try:
                target_folder = Folder.objects.get(id=folder_id, tenant=tenant)
            except Folder.DoesNotExist:
                return Response({"detail": "Target folder not found."}, status=status.HTTP_404_NOT_FOUND)

        count = File.objects.filter(
            id__in=file_ids, tenant=tenant, is_deleted=False
        ).update(parent_folder=target_folder)

        logger.info("Bulk moved %d files to folder %s by user %s", count, folder_id, request.user)
        return Response({"moved": count})


class BulkCopyView(APIView):
    """POST /api/files/bulk-copy/ – duplicate multiple files into a folder."""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def post(self, request):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        serializer = FileBulkDestinationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file_ids = serializer.validated_data["file_ids"]
        folder_id = serializer.validated_data.get("folder_id")

        try:
            target_folder = _resolve_folder(tenant, folder_id)
        except Folder.DoesNotExist:
            return Response({"detail": "Target folder not found."}, status=status.HTTP_404_NOT_FOUND)

        files = list(File.objects.filter(id__in=file_ids, tenant=tenant, is_deleted=False))
        if not files:
            return Response({"detail": "No files found to copy."}, status=status.HTTP_404_NOT_FOUND)

        total_size = sum(file_obj.file_size for file_obj in files)
        if tenant.storage_used + total_size > tenant.storage_quota:
            return Response(
                {"detail": "Storage quota exceeded. Cannot copy files."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        storage = get_storage_service()
        owner = _get_request_owner(request, tenant)
        user_id = _get_request_user_id(request)
        target_folder_path = _folder_path(target_folder)

        copied = 0
        copied_size = 0
        for file_obj in files:
            try:
                storage_path = storage.copy_file(file_obj.storage_path, str(tenant.id), user_id, target_folder_path)
            except FileNotFoundError:
                logger.warning("Copy skipped because source file was missing: %s", file_obj.storage_path)
                continue

            duplicated = File.objects.create(
                tenant=tenant,
                owner=owner,
                filename=file_obj.filename,
                original_filename=file_obj.original_filename,
                file_size=file_obj.file_size,
                file_type=file_obj.file_type,
                storage_path=storage_path,
                parent_folder=target_folder,
            )
            start_thumbnail_generation_thread(str(duplicated.id))
            copied += 1
            copied_size += file_obj.file_size

        if copied_size:
            tenant.storage_used += copied_size
            tenant.save(update_fields=["storage_used"])

        logger.info("Bulk copied %d files to folder %s by user %s", copied, folder_id, request.user)
        return Response({"copied": copied})


class FileCompressView(APIView):
    """POST /api/files/compress/ – create a zip archive from selected files."""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def post(self, request):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        if getattr(settings, "STORAGE_BACKEND", "local") != "local":
            return Response(
                {"detail": "Compressing files is only available with local storage."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        serializer = FileCompressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file_ids = serializer.validated_data["file_ids"]
        folder_id = serializer.validated_data.get("folder_id")

        try:
            target_folder = _resolve_folder(tenant, folder_id)
        except Folder.DoesNotExist:
            return Response({"detail": "Target folder not found."}, status=status.HTTP_404_NOT_FOUND)

        files = list(File.objects.filter(id__in=file_ids, tenant=tenant, is_deleted=False))
        if not files:
            return Response({"detail": "No files found to compress."}, status=status.HTTP_404_NOT_FOUND)

        archive_name = _normalize_archive_name(serializer.validated_data.get("archive_name"), files)
        storage = get_storage_service()
        temp_path = None

        try:
            with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as temp_file:
                temp_path = temp_file.name

            seen_names: set[str] = set()
            with zipfile.ZipFile(temp_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                for file_obj in files:
                    source_path = storage.get_file(file_obj.storage_path)
                    if source_path is None:
                        return Response(
                            {"detail": f'Source file missing for "{file_obj.original_filename}".'},
                            status=status.HTTP_404_NOT_FOUND,
                        )
                    member_name = _dedupe_archive_member_name(file_obj.original_filename, seen_names)
                    archive.write(str(source_path), arcname=member_name)

            archive_size = os.path.getsize(temp_path)
            if tenant.storage_used + archive_size > tenant.storage_quota:
                return Response(
                    {"detail": "Storage quota exceeded. Cannot create archive."},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )

            owner = _get_request_owner(request, tenant)
            user_id = _get_request_user_id(request)
            target_folder_path = _folder_path(target_folder)

            with open(temp_path, "rb") as archive_handle:
                archive_file = DjangoFile(archive_handle, name=archive_name)
                storage_path = storage.save_file(archive_file, str(tenant.id), user_id, target_folder_path)

            archive_record = File.objects.create(
                tenant=tenant,
                owner=owner,
                filename=archive_name,
                original_filename=archive_name,
                file_size=archive_size,
                file_type="application/zip",
                storage_path=storage_path,
                parent_folder=target_folder,
            )

            tenant.storage_used += archive_size
            tenant.save(update_fields=["storage_used"])

            logger.info("Compressed %d files into %s by user %s", len(files), archive_name, request.user)
            return Response(
                {"archive": FileSerializer(archive_record, context={"request": request}).data},
                status=status.HTTP_201_CREATED,
            )
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)


class FileExtractView(APIView):
    """POST /api/files/{id}/extract/ – extract a zip archive into a folder."""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def post(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        if getattr(settings, "STORAGE_BACKEND", "local") != "local":
            return Response(
                {"detail": "Extracting archives is only available with local storage."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        try:
            archive_file = File.objects.get(id=pk, tenant=tenant, is_deleted=False)
        except File.DoesNotExist:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        is_zip = archive_file.file_type == "application/zip" or archive_file.original_filename.lower().endswith(".zip")
        if not is_zip:
            return Response({"detail": "Only .zip archives can be extracted."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = FileExtractSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        folder_id = serializer.validated_data.get("folder_id", archive_file.parent_folder_id)
        try:
            target_folder = _resolve_folder(tenant, folder_id)
        except Folder.DoesNotExist:
            return Response({"detail": "Target folder not found."}, status=status.HTTP_404_NOT_FOUND)

        storage = get_storage_service()
        archive_path = storage.get_file(archive_file.storage_path)
        if archive_path is None:
            return Response({"detail": "Archive file could not be found on disk."}, status=status.HTTP_404_NOT_FOUND)

        owner = _get_request_owner(request, tenant)
        user_id = _get_request_user_id(request)

        try:
            with zipfile.ZipFile(archive_path, "r") as archive:
                members = []
                total_uncompressed = 0
                for info in archive.infolist():
                    parts = _sanitize_archive_member(info.filename)
                    if parts is None:
                        continue
                    members.append((info, parts))
                    if not info.is_dir():
                        total_uncompressed += info.file_size

                file_members = [(info, parts) for info, parts in members if not info.is_dir()]
                if not file_members:
                    return Response({"detail": "Archive does not contain extractable files."}, status=status.HTTP_400_BAD_REQUEST)

                if tenant.storage_used + total_uncompressed > tenant.storage_quota:
                    return Response(
                        {"detail": "Storage quota exceeded. Cannot extract archive."},
                        status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    )

                folder_name = serializer.validated_data.get("folder_name")
                if not folder_name:
                    folder_name = os.path.splitext(archive_file.original_filename)[0] or "Extracted"
                root_folder = Folder.objects.create(
                    tenant=tenant,
                    owner=owner,
                    parent=target_folder,
                    name=_ensure_unique_folder_name(tenant, target_folder, folder_name),
                )

                folder_cache: dict[tuple[str, ...], Folder] = {(): root_folder}
                extracted_count = 0
                extracted_size = 0

                for info, parts in members:
                    nested_parts = parts if info.is_dir() else parts[:-1]
                    destination_folder = root_folder
                    if nested_parts:
                        destination_folder = _get_or_create_nested_folder(
                            folder_cache,
                            tenant,
                            owner,
                            root_folder,
                            nested_parts,
                        )

                    if info.is_dir():
                        continue

                    filename = parts[-1][:500]
                    file_bytes = archive.read(info)
                    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
                    uploaded = SimpleUploadedFile(filename, file_bytes, content_type=content_type)
                    storage_path = storage.save_file(
                        uploaded,
                        str(tenant.id),
                        user_id,
                        _folder_path(destination_folder),
                    )

                    extracted_file = File.objects.create(
                        tenant=tenant,
                        owner=owner,
                        filename=filename,
                        original_filename=filename,
                        file_size=len(file_bytes),
                        file_type=content_type,
                        storage_path=storage_path,
                        parent_folder=destination_folder,
                    )
                    start_thumbnail_generation_thread(str(extracted_file.id))
                    extracted_count += 1
                    extracted_size += len(file_bytes)

                if extracted_count == 0:
                    root_folder.delete()
                    return Response({"detail": "Archive does not contain extractable files."}, status=status.HTTP_400_BAD_REQUEST)

                tenant.storage_used += extracted_size
                tenant.save(update_fields=["storage_used"])

                logger.info("Extracted archive %s into folder %s by user %s", archive_file.id, root_folder.id, request.user)
                return Response(
                    {
                        "extracted": extracted_count,
                        "folder_id": str(root_folder.id),
                        "folder_name": root_folder.name,
                    },
                    status=status.HTTP_201_CREATED,
                )
        except zipfile.BadZipFile:
            return Response({"detail": "The selected file is not a valid zip archive."}, status=status.HTTP_400_BAD_REQUEST)


class FileMoveView(APIView):
    """PUT /api/files/{id}/move/ – move a file to a different folder."""

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def put(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)
        try:
            file_obj = File.objects.select_related("owner").get(id=pk, tenant=tenant, is_deleted=False)
        except File.DoesNotExist:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = FileMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        folder_id = serializer.validated_data.get("folder_id")
        if folder_id:
            try:
                target_folder = Folder.objects.get(id=folder_id, tenant=tenant)
                file_obj.parent_folder = target_folder
            except Folder.DoesNotExist:
                return Response({"detail": "Target folder not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            file_obj.parent_folder = None

        file_obj.save(update_fields=["parent_folder", "updated_at"])
        logger.info("File moved: %s -> folder %s", pk, folder_id)
        return Response(FileSerializer(file_obj, context={"request": request}).data)
