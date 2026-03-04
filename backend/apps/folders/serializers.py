from rest_framework import serializers

from apps.accounts.serializers import UserBriefSerializer
from apps.files.serializers import FileSerializer

from .models import Folder


class FolderSerializer(serializers.ModelSerializer):
    """Basic folder representation (list / create)."""

    owner = UserBriefSerializer(read_only=True)

    class Meta:
        model = Folder
        fields = [
            "id",
            "name",
            "parent",
            "created_at",
            "updated_at",
            "owner",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "owner"]


class BreadcrumbSerializer(serializers.Serializer):
    """A single breadcrumb entry."""
    id = serializers.UUIDField()
    name = serializers.CharField()


class FolderDetailSerializer(serializers.ModelSerializer):
    """Detail view including children folders, files, and ancestor breadcrumbs."""

    owner = UserBriefSerializer(read_only=True)
    children = serializers.SerializerMethodField()
    files = serializers.SerializerMethodField()
    breadcrumbs = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = [
            "id",
            "name",
            "parent",
            "created_at",
            "updated_at",
            "owner",
            "children",
            "files",
            "breadcrumbs",
        ]
        read_only_fields = fields

    def get_breadcrumbs(self, obj):
        """Walk up the parent chain to build an ordered list of ancestors."""
        crumbs = []
        current = obj
        while current is not None:
            crumbs.append({"id": str(current.id), "name": current.name})
            current = current.parent
        crumbs.reverse()
        return crumbs

    def get_children(self, obj):
        child_folders = obj.children.all()
        return FolderSerializer(child_folders, many=True).data

    def get_files(self, obj):
        child_files = obj.files.filter(is_deleted=False).select_related("owner")
        return FileSerializer(child_files, many=True).data


class FolderCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    parent = serializers.UUIDField(required=False, allow_null=True)
