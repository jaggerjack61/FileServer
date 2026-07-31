from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.tenants.models import Tenant


class InactiveTenantTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            email="owner@example.test",
            username="owner",
            password="TestPassword123!",
            role="admin",
        )
        self.tenant = Tenant.objects.create(
            name="Test Tenant",
            slug="test-tenant",
            owner=self.user,
        )
        self.user.tenant = self.tenant
        self.user.save(update_fields=["tenant"])

    def test_inactive_tenant_cannot_login_or_refresh(self):
        client = APIClient()
        active_login = client.post(
            "/api/auth/login/",
            {"email": self.user.email, "password": "TestPassword123!"},
            format="json",
        )
        self.assertEqual(active_login.status_code, 200)
        tenant_payload = active_login.data["user"]["tenant"]
        self.assertTrue(tenant_payload["is_active"])
        self.assertEqual(tenant_payload["storage_used"], 0)
        self.assertEqual(tenant_payload["storage_quota"], self.tenant.storage_quota)

        self.tenant.is_active = False
        self.tenant.save(update_fields=["is_active"])

        inactive_login = client.post(
            "/api/auth/login/",
            {"email": self.user.email, "password": "TestPassword123!"},
            format="json",
        )
        self.assertEqual(inactive_login.status_code, 400)

        refresh = client.post(
            "/api/auth/refresh/",
            {"refresh": active_login.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh.status_code, 401)

    def test_existing_jwt_cannot_access_inactive_tenant_resources(self):
        client = APIClient()
        login = client.post(
            "/api/auth/login/",
            {"email": self.user.email, "password": "TestPassword123!"},
            format="json",
        )
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        self.tenant.is_active = False
        self.tenant.save(update_fields=["is_active"])

        self.assertEqual(client.get("/api/folders/").status_code, 403)
