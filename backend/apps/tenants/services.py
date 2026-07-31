from django.db.models import F, Value
from django.db.models.functions import Greatest

from .models import Tenant


def adjust_storage_used(tenant: Tenant, delta: int) -> int:
    """Apply a storage delta atomically and return the refreshed total.

    File mutations can arrive concurrently. Updating with an ``F`` expression
    prevents one request from overwriting another request's counter update.
    Deleted files cannot drive the denormalized counter below zero.
    """
    if not delta:
        return tenant.storage_used

    storage_expression = F("storage_used") + delta
    if delta < 0:
        storage_expression = Greatest(storage_expression, Value(0))

    Tenant.objects.filter(pk=tenant.pk).update(storage_used=storage_expression)
    tenant.refresh_from_db(fields=["storage_used"])
    return tenant.storage_used
