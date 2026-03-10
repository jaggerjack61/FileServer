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
        max_size = getattr(settings, "FILE_UPLOAD_MAX_MEMORY_SIZE", 104857600)
        if value.size > max_size:
            limit_mb = max_size / (1024 * 1024)
            raise serializers.ValidationError(f"File size exceeds {limit_mb:.0f} MB limit.")
        return value


class FileRenameSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=500)


class FileMoveSerializer(serializers.Serializer):
    folder_id = serializers.UUIDField(required=False, allow_null=True)


class FileContentUpdateSerializer(serializers.Serializer):
    content = serializers.CharField(allow_blank=True)


class FileOfficeContentSerializer(serializers.Serializer):
    content = serializers.JSONField()

    def validate_content(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Office content payload must be a JSON object.")

        kind = value.get("kind")
        format_name = value.get("format")

        if kind == "word":
            if format_name != "docx":
                raise serializers.ValidationError("Word payloads must declare format 'docx'.")
            paragraphs = value.get("paragraphs")
            if not isinstance(paragraphs, list) or not paragraphs:
                raise serializers.ValidationError("Word payloads must include at least one paragraph.")
            for paragraph in paragraphs:
                if not isinstance(paragraph, dict):
                    raise serializers.ValidationError("Each paragraph must be an object.")
                if "text" in paragraph and not isinstance(paragraph.get("text"), str):
                    raise serializers.ValidationError("Paragraph text must be a string.")
                runs = paragraph.get("runs")
                if runs is not None and not isinstance(runs, list):
                    raise serializers.ValidationError("Paragraph runs must be a list when provided.")

            tables = value.get("tables")
            if tables is not None:
                if not isinstance(tables, list):
                    raise serializers.ValidationError("Word tables must be a list when provided.")
                for table in tables:
                    if not isinstance(table, dict) or not isinstance(table.get("rows"), list):
                        raise serializers.ValidationError("Each table must provide a rows array.")

            blocks = value.get("blocks")
            if blocks is not None:
                if not isinstance(blocks, list):
                    raise serializers.ValidationError("Word blocks must be a list when provided.")
                for block in blocks:
                    if not isinstance(block, dict):
                        raise serializers.ValidationError("Each block must be an object.")
                    if block.get("type") not in {"paragraph", "table"}:
                        raise serializers.ValidationError("Block type must be either 'paragraph' or 'table'.")
                    if not isinstance(block.get("index"), int):
                        raise serializers.ValidationError("Block index must be an integer.")
            return value

        if kind == "spreadsheet":
            if format_name != "xlsx":
                raise serializers.ValidationError("Spreadsheet payloads must declare format 'xlsx'.")
            sheets = value.get("sheets")
            if not isinstance(sheets, list) or not sheets:
                raise serializers.ValidationError("Spreadsheet payloads must include at least one sheet.")
            return value

        if kind == "presentation":
            if format_name != "pptx":
                raise serializers.ValidationError("Presentation payloads must declare format 'pptx'.")
            slides = value.get("slides")
            if not isinstance(slides, list) or not slides:
                raise serializers.ValidationError("Presentation payloads must include at least one slide.")
            return value

        raise serializers.ValidationError("Unsupported office content payload.")


class FileIdListSerializer(serializers.Serializer):
    file_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )


class FileBulkDestinationSerializer(FileIdListSerializer):
    folder_id = serializers.UUIDField(required=False, allow_null=True)


class FileCompressSerializer(FileBulkDestinationSerializer):
    archive_name = serializers.CharField(required=False, allow_blank=True, max_length=255)


class FileExtractSerializer(serializers.Serializer):
    folder_id = serializers.UUIDField(required=False, allow_null=True)
    folder_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
