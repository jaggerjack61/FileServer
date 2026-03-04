from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "username", "role", "tenant", "is_active", "date_joined"]
    list_filter = ["role", "is_active", "tenant"]
    search_fields = ["email", "username"]
    ordering = ["-date_joined"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Platform", {"fields": ("role", "tenant")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Platform", {"fields": ("email", "role", "tenant")}),
    )
