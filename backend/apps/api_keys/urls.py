from django.urls import path

from . import views

urlpatterns = [
    path("", views.APIKeyListCreateView.as_view(), name="apikey-list-create"),
    path("<str:prefix>/", views.APIKeyDeleteView.as_view(), name="apikey-delete"),
]
