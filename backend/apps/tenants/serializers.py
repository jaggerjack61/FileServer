from rest_framework import serializers

from .models import Tenant


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "storage_quota",
            "storage_used",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TenantBriefSerializer(serializers.ModelSerializer):
    """Compact representation embedded in user / auth responses."""

    class Meta:
        model = Tenant
        fields = ["id", "name", "slug"]


class TenantDetailSerializer(serializers.ModelSerializer):
    """Detail representation including storage info."""

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "storage_quota",
            "storage_used",
            "is_active",
            "created_at",
            "updated_at",
        ]


class TenantAdminSerializer(serializers.ModelSerializer):
    """Admin view with usage stats."""

    member_count = serializers.SerializerMethodField()
    file_count = serializers.SerializerMethodField()
    owner_email = serializers.CharField(source="owner.email", read_only=True)

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "owner_email",
            "storage_quota",
            "storage_used",
            "is_active",
            "member_count",
            "file_count",
            "created_at",
            "updated_at",
        ]

    def get_member_count(self, obj):
        return obj.members.count()

    def get_file_count(self, obj):
        return obj.files.filter(is_deleted=False).count()
