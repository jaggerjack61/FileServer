import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.tenants.models import Tenant


DEFAULT_PASSWORD = "FileServer123!"
TENANT_NAME = "Demo Tenant"
TENANT_SLUG = "demo-tenant"

ACCOUNT_DEFINITIONS = (
    {
        "label": "Platform super-admin",
        "email": "admin@fileserver.local",
        "username": "admin",
        "role": "admin",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "label": "Tenant owner/admin",
        "email": "tenant-admin@fileserver.local",
        "username": "tenant_admin",
        "role": "admin",
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "label": "Tenant member/user",
        "email": "user@fileserver.local",
        "username": "tenant_user",
        "role": "user",
        "is_staff": False,
        "is_superuser": False,
    },
)


class Command(BaseCommand):
    help = "Create or update local demo accounts for every supported account type."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=os.environ.get("SEED_ACCOUNT_PASSWORD", DEFAULT_PASSWORD),
            help=(
                "Password assigned to every seeded account. Defaults to "
                "SEED_ACCOUNT_PASSWORD or the documented local-development password."
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]
        if not password:
            raise ValueError("The seed password cannot be empty.")

        User = get_user_model()
        seeded_users = {}

        for definition in ACCOUNT_DEFINITIONS:
            user, created = User.objects.get_or_create(email=definition["email"])
            user.username = definition["username"]
            user.role = definition["role"]
            user.is_staff = definition["is_staff"]
            user.is_superuser = definition["is_superuser"]
            user.is_active = True
            user.set_password(password)
            user.save()
            seeded_users[definition["email"]] = user

            action = "Created" if created else "Updated"
            self.stdout.write(f"{action}: {definition['label']} ({user.email})")

        tenant_admin = seeded_users["tenant-admin@fileserver.local"]
        tenant, tenant_created = Tenant.objects.update_or_create(
            slug=TENANT_SLUG,
            defaults={
                "name": TENANT_NAME,
                "owner": tenant_admin,
                "is_active": True,
            },
        )

        platform_admin = seeded_users["admin@fileserver.local"]
        platform_admin.tenant = None
        platform_admin.save(update_fields=["tenant"])

        for email in ("tenant-admin@fileserver.local", "user@fileserver.local"):
            user = seeded_users[email]
            user.tenant = tenant
            user.save(update_fields=["tenant"])

        tenant_action = "Created" if tenant_created else "Updated"
        self.stdout.write(f"{tenant_action}: {TENANT_NAME} ({TENANT_SLUG})")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Demo accounts are ready:"))
        for definition in ACCOUNT_DEFINITIONS:
            self.stdout.write(f"  {definition['label']}: {definition['email']}")
        self.stdout.write(f"  Password: {password}")
        self.stdout.write(
            self.style.WARNING(
                "These credentials are for local development only. "
                "Use --password or SEED_ACCOUNT_PASSWORD to override them."
            )
        )
