"""Root URL configuration."""

from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/files/", include("apps.files.urls")),
    path("api/folders/", include("apps.folders.urls")),
    path("api/apikeys/", include("apps.api_keys.urls")),
    path("api/admin/", include("apps.tenants.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
