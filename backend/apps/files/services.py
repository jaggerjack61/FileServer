"""
Storage service abstraction.

For development: uses local filesystem under MEDIA_ROOT.
For production:  swap to S3 / MinIO by setting STORAGE_BACKEND = "s3" in settings.

File path convention: {tenant_id}/{user_id}/{folder_path}/{unique_filename}
"""

import logging
import os
import shutil
import subprocess
import uuid
from threading import Thread
from pathlib import Path

from django.conf import settings
from django.db import close_old_connections
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)


class LocalStorageService:
    """Store and retrieve files on the local filesystem."""

    def __init__(self):
        self.root = Path(settings.MEDIA_ROOT)
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, storage_path: str) -> Path:
        return self.root / storage_path

    def save_file(self, file, tenant_id: str, user_id: str, folder_path: str = "") -> str:
        """
        Persist an uploaded file and return the relative storage_path.

        Parameters
        ----------
        file : UploadedFile
        tenant_id, user_id : str (UUIDs)
        folder_path : str  – optional sub-directory inside the user folder
        """
        ext = os.path.splitext(file.name)[1]
        unique_name = f"{uuid.uuid4().hex}{ext}"
        rel_dir = os.path.join(str(tenant_id), str(user_id), folder_path)
        abs_dir = self._resolve(rel_dir)
        abs_dir.mkdir(parents=True, exist_ok=True)
        abs_path = abs_dir / unique_name
        with open(abs_path, "wb+") as dest:
            for chunk in file.chunks():
                dest.write(chunk)
        storage_path = os.path.join(rel_dir, unique_name)
        logger.info("File saved: %s (%d bytes)", storage_path, file.size)
        return storage_path

    def delete_file(self, storage_path: str) -> bool:
        """Remove a file from disk. Returns True if deleted."""
        abs_path = self._resolve(storage_path)
        if abs_path.exists():
            abs_path.unlink()
            logger.info("File deleted: %s", storage_path)
            return True
        logger.warning("File not found for deletion: %s", storage_path)
        return False

    def get_file(self, storage_path: str) -> Path | None:
        """Return the absolute Path if the file exists, else None."""
        abs_path = self._resolve(storage_path)
        return abs_path if abs_path.exists() else None


class S3StorageService:
    """
    S3 / MinIO storage backend (production).

    To enable:
      1. pip install boto3
      2. Set STORAGE_BACKEND = "s3" plus AWS_* vars in settings.
    """

    def __init__(self):
        import boto3

        self.bucket = settings.AWS_STORAGE_BUCKET_NAME
        self.client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=getattr(settings, "AWS_S3_REGION_NAME", "us-east-1"),
            endpoint_url=getattr(settings, "AWS_S3_ENDPOINT_URL", None) or None,
        )

    def save_file(self, file, tenant_id: str, user_id: str, folder_path: str = "") -> str:
        ext = os.path.splitext(file.name)[1]
        unique_name = f"{uuid.uuid4().hex}{ext}"
        key = f"{tenant_id}/{user_id}/{folder_path}/{unique_name}".replace("//", "/")
        self.client.upload_fileobj(file, self.bucket, key)
        logger.info("S3 file saved: %s", key)
        return key

    def delete_file(self, storage_path: str) -> bool:
        self.client.delete_object(Bucket=self.bucket, Key=storage_path)
        logger.info("S3 file deleted: %s", storage_path)
        return True

    def get_file(self, storage_path: str):
        """Return a presigned URL string."""
        url = self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": storage_path},
            ExpiresIn=3600,
        )
        return url


def get_storage_service():
    """Factory – returns the correct storage backend based on settings."""
    backend = getattr(settings, "STORAGE_BACKEND", "local")
    if backend == "s3":
        return S3StorageService()
    return LocalStorageService()


def _is_image_media(file_type: str) -> bool:
    return (file_type or "").startswith("image/")


def _is_video_media(file_type: str) -> bool:
    return (file_type or "").startswith("video/")


def _resolve_ffmpeg_executable() -> str | None:
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
    try:
        from imageio_ffmpeg import get_ffmpeg_exe

        return get_ffmpeg_exe()
    except Exception:
        return None


def _thumbnail_path_for(storage_path: str) -> str:
    source = Path(storage_path)
    thumb_name = f"{source.stem}_thumb.jpg"
    return str(source.parent / "thumbnails" / thumb_name).replace("\\", "/")


def generate_thumbnail_for_file(file_id: str, force: bool = False) -> bool:
    """
    Generate a small thumbnail for an image file.

    Returns True when a thumbnail is generated, else False.
    """
    try:
        from .models import File

        file_obj = File.objects.filter(id=file_id, is_deleted=False).first()
        if not file_obj:
            logger.warning("Thumbnail generation skipped: file not found (%s)", file_id)
            return False

        if not (_is_image_media(file_obj.file_type) or _is_video_media(file_obj.file_type)):
            return False

        if not force and file_obj.thumbnail_path:
            thumb_existing = Path(settings.MEDIA_ROOT) / file_obj.thumbnail_path
            if thumb_existing.exists():
                return False

        if getattr(settings, "STORAGE_BACKEND", "local") != "local":
            logger.info("Thumbnail generation skipped for non-local backend: %s", file_id)
            return False

        source_path = Path(settings.MEDIA_ROOT) / file_obj.storage_path
        if not source_path.exists():
            logger.warning("Thumbnail generation skipped: source missing (%s)", file_obj.storage_path)
            return False

        thumb_rel = _thumbnail_path_for(file_obj.storage_path)
        thumb_abs = Path(settings.MEDIA_ROOT) / thumb_rel
        thumb_abs.parent.mkdir(parents=True, exist_ok=True)

        if _is_image_media(file_obj.file_type):
            with Image.open(source_path) as img:
                img = img.convert("RGB")
                img.thumbnail((220, 220))
                img.save(thumb_abs, format="JPEG", optimize=True, quality=70)
        else:
            ffmpeg_exe = _resolve_ffmpeg_executable()
            if not ffmpeg_exe:
                logger.warning(
                    "No ffmpeg executable available; install ffmpeg or imageio-ffmpeg for video thumbnails."
                )
                return False

            ffmpeg_cmd = [
                ffmpeg_exe,
                "-y",
                "-ss",
                "00:00:01",
                "-i",
                str(source_path),
                "-frames:v",
                "1",
                "-vf",
                "scale='min(220,iw)':-2",
                str(thumb_abs),
            ]
            try:
                subprocess.run(
                    ffmpeg_cmd,
                    check=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            except FileNotFoundError:
                logger.warning("ffmpeg not found; cannot generate video thumbnail for %s", file_obj.id)
                return False
            except subprocess.CalledProcessError:
                logger.warning("ffmpeg failed generating video thumbnail for %s", file_obj.id)
                return False

        file_obj.thumbnail_path = thumb_rel
        file_obj.save(update_fields=["thumbnail_path", "updated_at"])
        logger.info("Thumbnail generated for file %s -> %s", file_obj.id, thumb_rel)
        return True
    except (UnidentifiedImageError, OSError) as exc:
        logger.warning("Thumbnail generation failed for %s: %s", file_id, exc)
        return False


def _thread_thumbnail_worker(file_id: str) -> None:
    close_old_connections()
    try:
        generate_thumbnail_for_file(file_id, force=False)
    finally:
        close_old_connections()


def start_thumbnail_generation_thread(file_id: str) -> None:
    """Fire-and-forget thumbnail generation to avoid blocking upload response."""
    thread = Thread(
        target=_thread_thumbnail_worker,
        args=(str(file_id),),
        daemon=True,
        name=f"thumb-gen-{file_id}",
    )
    thread.start()
