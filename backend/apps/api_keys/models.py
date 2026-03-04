from django.db import models
from rest_framework_api_key.models import AbstractAPIKey


class TenantAPIKey(AbstractAPIKey):
    """API key scoped to a specific tenant."""

    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="api_keys",
    )
    permissions = models.JSONField(
        default=list,
        help_text="List of permission strings: read, write, delete, admin",
    )
    last_used = models.DateTimeField(null=True, blank=True)

    class Meta(AbstractAPIKey.Meta):
        verbose_name = "Tenant API key"
        verbose_name_plural = "Tenant API keys"

    def __str__(self):
        return f"{self.name} ({self.tenant.name})"
