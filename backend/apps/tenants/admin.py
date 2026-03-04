from django.contrib import admin

from .models import Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "owner", "storage_used", "storage_quota", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug"]
    readonly_fields = ["id", "created_at", "updated_at"]
