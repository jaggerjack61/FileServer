from pathlib import Path
from django.db.models import Q

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.files.models import File
from apps.files.services import generate_thumbnail_for_file


class Command(BaseCommand):
    help = "Generate thumbnails for existing media files that do not have one yet."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant-id",
            dest="tenant_id",
            type=str,
            help="Only process files for a specific tenant UUID.",
        )
        parser.add_argument(
            "--limit",
            dest="limit",
            type=int,
            default=0,
            help="Maximum number of files to process (0 = no limit).",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Regenerate thumbnails even when thumbnail_path is already set.",
        )

    def handle(self, *args, **options):
        tenant_id = options["tenant_id"]
        limit = options["limit"]
        force = options["force"]

        qs = File.objects.filter(is_deleted=False).filter(
            Q(file_type__startswith="image/") | Q(file_type__startswith="video/")
        ).order_by("created_at")
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)

        processed = 0
        generated = 0
        skipped = 0

        for file_obj in qs.iterator():
            if limit and processed >= limit:
                break

            processed += 1

            should_generate = force
            if not should_generate:
                if not file_obj.thumbnail_path:
                    should_generate = True
                else:
                    thumb_abs = Path(settings.MEDIA_ROOT) / file_obj.thumbnail_path
                    should_generate = not thumb_abs.exists()

            if not should_generate:
                skipped += 1
                continue

            ok = generate_thumbnail_for_file(str(file_obj.id), force=True)
            if ok:
                generated += 1
            else:
                skipped += 1
            if processed % 100 == 0:
                self.stdout.write(self.style.NOTICE(f"Processed {processed} files..."))

        self.stdout.write(
            self.style.SUCCESS(
                f"Thumbnail backfill complete. Processed={processed}, Generated={generated}, Skipped={skipped}"
            )
        )
