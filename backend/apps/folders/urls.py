from django.urls import path

from . import views

urlpatterns = [
    path("", views.FolderListCreateView.as_view(), name="folder-list-create"),
    path("<uuid:pk>/", views.FolderDetailView.as_view(), name="folder-detail"),
]
