from django.urls import path

from . import views

urlpatterns = [
    path("tenants/", views.TenantListView.as_view(), name="admin-tenant-list"),
    path("tenants/<uuid:pk>/", views.TenantDetailView.as_view(), name="admin-tenant-detail"),
    path("tenants/<uuid:pk>/api-keys/", views.TenantAPIKeysView.as_view(), name="admin-tenant-apikeys"),
    path("activity/", views.ActivityLogView.as_view(), name="admin-activity-log"),
    path("storage-usage/", views.StorageUsageView.as_view(), name="admin-storage-usage"),
    path("system-metrics/", views.SystemMetricsView.as_view(), name="admin-system-metrics"),
]
