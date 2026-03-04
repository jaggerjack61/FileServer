from django.contrib import admin

from .models import File


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ["filename", "tenant", "owner", "file_size", "file_type", "is_deleted", "created_at"]
    list_filter = ["is_deleted", "file_type"]
    search_fields = ["filename", "original_filename"]
    readonly_fields = ["id", "created_at", "updated_at"]
