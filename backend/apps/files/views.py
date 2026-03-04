import logging
import mimetypes

from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api_keys.permissions import HasTenantAPIKey
from apps.folders.models import Folder
from apps.tenants.models import Tenant

from .models import File
from .serializers import FileRenameSerializer, FileSerializer, FileUploadSerializer, FileMoveSerializer
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
