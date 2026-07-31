from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.tenants.models import Tenant

from .models import Folder


class FolderValidationTests(TestCase):
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
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_rename_rejects_blank_and_duplicate_names(self):
        first = Folder.objects.create(tenant=self.tenant, owner=self.user, name="First")
        second = Folder.objects.create(tenant=self.tenant, owner=self.user, name="Second")

        blank = self.client.put(
            f"/api/folders/{first.id}/",
            {"name": "  "},
            format="json",
        )
        self.assertEqual(blank.status_code, 400)

        duplicate = self.client.put(
            f"/api/folders/{second.id}/",
            {"name": "First"},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 409)
