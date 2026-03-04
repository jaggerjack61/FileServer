from django.contrib import admin

from .models import Folder


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ["name", "tenant", "owner", "parent", "created_at"]
    list_filter = ["tenant"]
    search_fields = ["name"]
    readonly_fields = ["id", "created_at", "updated_at"]
