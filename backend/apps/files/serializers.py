from rest_framework import serializers
from django.conf import settings

from apps.accounts.serializers import UserBriefSerializer

from .models import File


class FileSerializer(serializers.ModelSerializer):
    """Read representation returned by list / detail endpoints."""

    owner = UserBriefSerializer(read_only=True)
    download_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = [
            "id",
            "filename",
            "original_filename",
            "file_size",
            "file_type",
            "thumbnail_url",
            "parent_folder",
            "is_deleted",
            "created_at",
            "updated_at",
            "owner",
            "download_url",
        ]
        read_only_fields = fields  # entirely read-only

    def get_download_url(self, obj):
        return f"/api/files/{obj.id}/download/"

    def get_thumbnail_url(self, obj):
        if not obj.thumbnail_path:
            return None
        media_rel = f"/media/{obj.thumbnail_path}"
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(media_rel)
        backend_base = getattr(settings, "BACKEND_BASE_URL", "http://localhost:8000")
        return f"{backend_base}{media_rel}"


class FileUploadSerializer(serializers.Serializer):
    """Validates upload payload."""

    file = serializers.FileField()
    folder_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_file(self, value):
        max_size = 104857600  # 100 MB
        if value.size > max_size:
            raise serializers.ValidationError("File size exceeds 100 MB limit.")
        return value


class FileRenameSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=500)


class FileMoveSerializer(serializers.Serializer):
    folder_id = serializers.UUIDField(required=False, allow_null=True)
