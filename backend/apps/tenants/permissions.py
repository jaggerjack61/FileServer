from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """Only Django superusers may access this view."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser


class IsTenantOwner(permissions.BasePermission):
    """Only the tenant owner may perform this action."""

    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user


class IsTenantAdmin(permissions.BasePermission):
    """User must be an admin of their tenant."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.tenant
            and request.user.tenant.is_active
            and request.user.role == "admin"
        )
