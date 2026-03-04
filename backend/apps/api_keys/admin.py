from django.contrib import admin
from rest_framework_api_key.admin import APIKeyModelAdmin

from .models import TenantAPIKey


@admin.register(TenantAPIKey)
class TenantAPIKeyAdmin(APIKeyModelAdmin):
    list_display = [*APIKeyModelAdmin.list_display, "tenant", "last_used"]
    list_filter = ["tenant"]
