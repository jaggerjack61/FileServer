from django.urls import path

from . import views

urlpatterns = [
    path("upload/", views.FileUploadView.as_view(), name="file-upload"),
    path("trash/", views.TrashListView.as_view(), name="file-trash-list"),
    path("trash/<uuid:pk>/restore/", views.TrashRestoreView.as_view(), name="file-trash-restore"),
    path("bulk-delete/", views.BulkDeleteView.as_view(), name="file-bulk-delete"),
    path("bulk-copy/", views.BulkCopyView.as_view(), name="file-bulk-copy"),
    path("bulk-move/", views.BulkMoveView.as_view(), name="file-bulk-move"),
    path("compress/", views.FileCompressView.as_view(), name="file-compress"),
    path("", views.FileListView.as_view(), name="file-list"),
    path("<uuid:pk>/", views.FileDetailView.as_view(), name="file-detail"),
    path("<uuid:pk>/extract/", views.FileExtractView.as_view(), name="file-extract"),
    path("<uuid:pk>/rename/", views.FileRenameView.as_view(), name="file-rename"),
    path("<uuid:pk>/move/", views.FileMoveView.as_view(), name="file-move"),
    path("<uuid:pk>/download/", views.FileDownloadView.as_view(), name="file-download"),
]
