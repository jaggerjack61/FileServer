import uuid

from django.conf import settings
from django.db import models


class File(models.Model):
    """Represents a stored file belonging to a tenant."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="files",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="files",
    )
    filename = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=500)
    file_size = models.BigIntegerField()
    file_type = models.CharField(max_length=255)
    storage_path = models.CharField(max_length=1000)
    thumbnail_path = models.CharField(max_length=1000, null=True, blank=True)
    parent_folder = models.ForeignKey(
        "folders.Folder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="files",
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.filename
