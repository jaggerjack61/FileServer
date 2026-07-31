from rest_framework_api_key.permissions import BaseHasAPIKey

from .models import TenantAPIKey


class HasTenantAPIKey(BaseHasAPIKey):
    """
    Validates the request carries a valid TenantAPIKey via the X-API-Key header.

    When the key is valid the middleware‑like behaviour attaches ``request.tenant``
    so downstream views can scope queries to the right tenant.
    """

    model = TenantAPIKey

    def has_permission(self, request, view):
        raw_key = self.get_key(request)
        if not raw_key:
            return False

        try:
            api_key = TenantAPIKey.objects.get_from_key(raw_key)
        except TenantAPIKey.DoesNotExist:
            return False

        if not api_key.tenant.is_active or not self._has_scope(api_key, request):
            return False

        from django.utils import timezone

        request.tenant = api_key.tenant
        request.api_key = api_key
        api_key.last_used = timezone.now()
        api_key.save(update_fields=["last_used"])
        return True

    @staticmethod
    def _has_scope(api_key, request):
        """Enforce broad and resource-specific permissions for API-key calls."""
        permissions = set(api_key.permissions or [])
        if "admin" in permissions:
            return True

        if request.path.startswith("/api/files/"):
            resource = "files"
        elif request.path.startswith("/api/folders/"):
            resource = "folders"
        else:
            return False

        if request.method in ("GET", "HEAD", "OPTIONS"):
            action = "read"
        elif request.method == "DELETE":
            action = "delete"
        else:
            action = "write"

        return action in permissions or f"{resource}:{action}" in permissions
