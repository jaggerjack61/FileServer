from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api_keys.permissions import HasTenantAPIKey
from apps.tenants.services import adjust_storage_used

from .models import Folder
from .serializers import FolderCreateSerializer, FolderDetailSerializer, FolderSerializer


def _get_tenant(request):
    if hasattr(request, "tenant") and request.tenant.is_active:
        return request.tenant
    if (
        request.user
        and request.user.is_authenticated
        and request.user.tenant
        and request.user.tenant.is_active
    ):
        return request.user.tenant
    return None


class FolderListCreateView(APIView):
    """
    GET  /api/folders/         – list folders
    POST /api/folders/         – create folder
    """

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def get(self, request):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        qs = Folder.objects.filter(tenant=tenant).select_related("owner")

        parent = request.query_params.get("parent")
        if parent:
            qs = qs.filter(parent_id=parent)
        else:
            qs = qs.filter(parent__isnull=True)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)

        qs = qs.order_by("name")

        from rest_framework.pagination import PageNumberPagination

        paginator = PageNumberPagination()
        paginator.page_size = 50
        page = paginator.paginate_queryset(qs, request)
        serializer = FolderSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        serializer = FolderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        parent_id = serializer.validated_data.get("parent")
        parent_folder = None
        if parent_id:
            try:
                parent_folder = Folder.objects.get(id=parent_id, tenant=tenant)
            except Folder.DoesNotExist:
                return Response({"detail": "Parent folder not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check for duplicate name in same parent
        name = serializer.validated_data["name"]
        if Folder.objects.filter(tenant=tenant, parent=parent_folder, name=name).exists():
            return Response(
                {"detail": "A folder with this name already exists in this location."},
                status=status.HTTP_409_CONFLICT,
            )

        folder = Folder.objects.create(
            tenant=tenant,
            owner=request.user if request.user.is_authenticated else tenant.owner,
            name=name,
            parent=parent_folder,
        )
        return Response(FolderSerializer(folder).data, status=status.HTTP_201_CREATED)


class FolderDetailView(APIView):
    """
    GET    /api/folders/{id}/  – folder detail with children & files
    PUT    /api/folders/{id}/  – rename / update folder
    DELETE /api/folders/{id}/  – delete folder
    """

    permission_classes = [IsAuthenticated | HasTenantAPIKey]

    def get(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)
        try:
            folder = Folder.objects.select_related("owner").get(id=pk, tenant=tenant)
        except Folder.DoesNotExist:
            return Response({"detail": "Folder not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(FolderDetailSerializer(folder).data)

    def put(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)
        try:
            folder = Folder.objects.select_related("owner").get(id=pk, tenant=tenant)
        except Folder.DoesNotExist:
            return Response({"detail": "Folder not found."}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get("name")
        if not isinstance(name, str) or not name.strip():
            return Response(
                {"detail": "Folder name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        name = name.strip()
        if len(name) > 255:
            return Response(
                {"detail": "Folder name must be 255 characters or fewer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Folder.objects.filter(
            tenant=tenant,
            parent=folder.parent,
            name=name,
        ).exclude(id=folder.id).exists():
            return Response(
                {"detail": "A folder with this name already exists in this location."},
                status=status.HTTP_409_CONFLICT,
            )

        folder.name = name
        folder.save(update_fields=["name", "updated_at"])

        return Response(FolderSerializer(folder).data)

    def delete(self, request, pk):
        tenant = _get_tenant(request)
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)
        try:
            folder = Folder.objects.get(id=pk, tenant=tenant)
        except Folder.DoesNotExist:
            return Response({"detail": "Folder not found."}, status=status.HTTP_404_NOT_FOUND)

        # Soft-delete all files in this folder tree
        total_freed = _soft_delete_folder_files(folder, tenant)
        if total_freed:
            adjust_storage_used(tenant, -total_freed)

        folder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _soft_delete_folder_files(folder, tenant):
    """Recursively soft-delete files in a folder and its children."""
    from apps.files.models import File

    files = File.objects.filter(parent_folder=folder, tenant=tenant, is_deleted=False)
    total_freed = sum(f.file_size for f in files)
    files.update(is_deleted=True)

    for child in folder.children.all():
        total_freed += _soft_delete_folder_files(child, tenant)

    return total_freed
