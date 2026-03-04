from django.db.models import Sum
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Tenant
from .permissions import IsSuperAdmin
from .serializers import TenantAdminSerializer


class TenantListView(APIView):
    """GET /api/admin/tenants/ – Super Admin only."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        tenants = Tenant.objects.select_related("owner").all()
        serializer = TenantAdminSerializer(tenants, many=True)
        return Response(serializer.data)


class TenantDetailView(APIView):
    """
    GET   /api/admin/tenants/{id}/  – single tenant details
    PATCH /api/admin/tenants/{id}/  – update tenant (quota, is_active)
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, pk):
        try:
            tenant = Tenant.objects.select_related("owner").get(id=pk)
        except Tenant.DoesNotExist:
            return Response({"detail": "Tenant not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TenantAdminSerializer(tenant).data)

    def patch(self, request, pk):
        try:
            tenant = Tenant.objects.select_related("owner").get(id=pk)
        except Tenant.DoesNotExist:
            return Response({"detail": "Tenant not found."}, status=status.HTTP_404_NOT_FOUND)

        update_fields = []

        if "is_active" in request.data:
            tenant.is_active = bool(request.data["is_active"])
            update_fields.append("is_active")

        if "storage_quota" in request.data:
            try:
                tenant.storage_quota = int(request.data["storage_quota"])
                update_fields.append("storage_quota")
            except (ValueError, TypeError):
                return Response({"detail": "Invalid storage_quota."}, status=status.HTTP_400_BAD_REQUEST)

        if "name" in request.data:
            tenant.name = request.data["name"]
            update_fields.append("name")

        if update_fields:
            tenant.save(update_fields=update_fields + ["updated_at"])

        return Response(TenantAdminSerializer(tenant).data)


class TenantAPIKeysView(APIView):
    """GET /api/admin/tenants/{id}/api-keys/ – list API keys for a tenant."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, pk):
        try:
            tenant = Tenant.objects.get(id=pk)
        except Tenant.DoesNotExist:
            return Response({"detail": "Tenant not found."}, status=status.HTTP_404_NOT_FOUND)

        from apps.api_keys.models import TenantAPIKey
        from apps.api_keys.serializers import APIKeyListSerializer

        keys = TenantAPIKey.objects.filter(tenant=tenant).order_by("-created")
        serializer = APIKeyListSerializer(keys, many=True)
        return Response({
            "count": keys.count(),
            "results": serializer.data,
        })


class ActivityLogView(APIView):
    """GET /api/admin/activity/ – recent file activity (simple log)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        from apps.files.models import File

        # Recent uploads (last 50)
        recent_uploads = File.objects.select_related("owner", "tenant").order_by("-created_at")[:25]
        recent_deletions = File.objects.filter(is_deleted=True).select_related("owner", "tenant").order_by("-updated_at")[:25]

        uploads = [
            {
                "action": "upload",
                "filename": f.original_filename,
                "file_size": f.file_size,
                "user": f.owner.email,
                "tenant": f.tenant.name,
                "timestamp": f.created_at.isoformat(),
            }
            for f in recent_uploads
        ]

        deletions = [
            {
                "action": "delete",
                "filename": f.original_filename,
                "file_size": f.file_size,
                "user": f.owner.email,
                "tenant": f.tenant.name,
                "timestamp": f.updated_at.isoformat(),
            }
            for f in recent_deletions
        ]

        # Merge and sort by timestamp descending
        activities = sorted(uploads + deletions, key=lambda x: x["timestamp"], reverse=True)[:50]
        return Response({"count": len(activities), "results": activities})


class StorageUsageView(APIView):
    """GET /api/admin/storage-usage/ – Overall storage usage metrics."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        from apps.files.models import File

        tenants = Tenant.objects.all()
        total_tenants = tenants.count()
        total_storage_used = tenants.aggregate(total=Sum("storage_used"))["total"] or 0
        total_storage_quota = tenants.aggregate(total=Sum("storage_quota"))["total"] or 0
        total_files = File.objects.filter(is_deleted=False).count()

        tenant_data = []
        for t in tenants:
            file_count = File.objects.filter(tenant=t, is_deleted=False).count()
            tenant_data.append(
                {
                    "id": str(t.id),
                    "name": t.name,
                    "storage_used": t.storage_used,
                    "storage_quota": t.storage_quota,
                    "file_count": file_count,
                }
            )

        return Response(
            {
                "total_tenants": total_tenants,
                "total_files": total_files,
                "total_storage_used": total_storage_used,
                "total_storage_quota": total_storage_quota,
                "usage_percentage": (
                    round(total_storage_used / total_storage_quota * 100, 2)
                    if total_storage_quota
                    else 0
                ),
                "tenants": tenant_data,
            }
        )


class SystemMetricsView(APIView):
    """GET /api/admin/system-metrics/ – System health metrics."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        import platform
        import time

        from apps.accounts.models import User
        from apps.files.models import File

        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        total_files = File.objects.filter(is_deleted=False).count()
        total_deleted_files = File.objects.filter(is_deleted=True).count()
        total_tenants = Tenant.objects.count()
        active_tenants = Tenant.objects.filter(is_active=True).count()

        # Basic system metrics (safe defaults when psutil isn't available)
        try:
            import psutil

            cpu_usage = psutil.cpu_percent(interval=0.1)
            memory_usage = psutil.virtual_memory().percent
            disk_usage = psutil.disk_usage("/").percent
        except ImportError:
            cpu_usage = 0
            memory_usage = 0
            disk_usage = 0

        return Response(
            {
                "total_users": total_users,
                "active_users": active_users,
                "total_files": total_files,
                "total_deleted_files": total_deleted_files,
                "total_tenants": total_tenants,
                "active_tenants": active_tenants,
                "cpu_usage": cpu_usage,
                "memory_usage": memory_usage,
                "disk_usage": disk_usage,
                "uptime": platform.platform(),
            }
        )
