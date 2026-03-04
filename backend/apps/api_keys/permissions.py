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
        key_valid = super().has_permission(request, view)
        if key_valid:
            # Attach tenant to request for downstream use
            from django.utils import timezone

            key = self._get_key_object(request)
            if key:
                request.tenant = key.tenant
                key.last_used = timezone.now()
                key.save(update_fields=["last_used"])
        return key_valid

    def _get_key_object(self, request):
        """Retrieve the TenantAPIKey instance from the request header."""
        key = self.get_key(request)
        if key:
            try:
                return TenantAPIKey.objects.get_from_key(key)
            except TenantAPIKey.DoesNotExist:
                return None
        return None
