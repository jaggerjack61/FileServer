from rest_framework import serializers

from .models import TenantAPIKey


VALID_PERMISSIONS = [
    "read", "write", "delete", "admin",
    "files:read", "files:write", "files:delete",
    "folders:read", "folders:write", "folders:delete",
]


class APIKeyCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=VALID_PERMISSIONS),
        default=["read"],
    )


class APIKeyResponseSerializer(serializers.ModelSerializer):
    """Returned after creation – shows the raw key once."""

    key = serializers.CharField(read_only=True)

    class Meta:
        model = TenantAPIKey
        fields = ["prefix", "name", "key", "permissions", "created"]
        read_only_fields = fields


class APIKeyListSerializer(serializers.ModelSerializer):
    """List view – never shows the full key, only prefix."""

    class Meta:
        model = TenantAPIKey
        fields = ["prefix", "name", "permissions", "created", "last_used", "revoked"]
        read_only_fields = fields
