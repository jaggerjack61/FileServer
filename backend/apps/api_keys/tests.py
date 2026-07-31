from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.folders.models import Folder
from apps.tenants.models import Tenant

from .models import TenantAPIKey


class APIKeyAuthorizationTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.admin = user_model.objects.create_user(
            email="admin@example.test",
            username="tenant-admin",
            password="TestPassword123!",
            role="admin",
        )
        self.tenant = Tenant.objects.create(
            name="Test Tenant",
            slug="test-tenant",
            owner=self.admin,
        )
        self.admin.tenant = self.tenant
        self.admin.save(update_fields=["tenant"])
        self.member = user_model.objects.create_user(
            email="member@example.test",
            username="tenant-member",
            password="TestPassword123!",
            role="user",
            tenant=self.tenant,
        )

    def authenticated_client(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def key_client(self, permissions):
        _, raw_key = TenantAPIKey.objects.create_key(
            name="Test key",
            tenant=self.tenant,
            permissions=permissions,
        )
        client = APIClient()
        client.credentials(HTTP_X_API_KEY=raw_key)
        return client

    def test_only_tenant_admin_can_manage_api_keys(self):
        response = self.authenticated_client(self.member).post(
            "/api/apikeys/",
            {"name": "Member key", "permissions": ["read"]},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        response = self.authenticated_client(self.admin).post(
            "/api/apikeys/",
            {"name": "Admin key", "permissions": ["read"]},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("id", response.data)
        self.assertIn("prefix", response.data)

    def test_read_only_key_cannot_write_or_delete_folders(self):
        folder = Folder.objects.create(
            tenant=self.tenant,
            owner=self.admin,
            name="Existing",
        )
        client = self.key_client(["folders:read"])

        self.assertEqual(client.get("/api/folders/").status_code, 200)
        self.assertIn(
            client.post("/api/folders/", {"name": "Forbidden"}, format="json").status_code,
            (401, 403),
        )
        self.assertIn(client.delete(f"/api/folders/{folder.id}/").status_code, (401, 403))

    def test_resource_scopes_are_enforced_independently(self):
        write_client = self.key_client(["folders:write"])
        created = write_client.post(
            "/api/folders/",
            {"name": "Created with write scope"},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertIn(
            write_client.delete(f"/api/folders/{created.data['id']}/").status_code,
            (401, 403),
        )

        delete_client = self.key_client(["folders:delete"])
        self.assertEqual(
            delete_client.delete(f"/api/folders/{created.data['id']}/").status_code,
            204,
        )

    def test_inactive_tenant_key_is_rejected(self):
        client = self.key_client(["folders:read"])
        self.tenant.is_active = False
        self.tenant.save(update_fields=["is_active"])

        self.assertIn(client.get("/api/folders/").status_code, (401, 403))
