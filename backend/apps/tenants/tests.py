from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Tenant
from .services import adjust_storage_used


class StorageCounterTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        owner = user_model.objects.create_user(
            email="storage-owner@example.test",
            username="storage-owner",
            password="TestPassword123!",
            role="admin",
        )
        self.tenant = Tenant.objects.create(
            name="Storage Tenant",
            slug="storage-tenant",
            owner=owner,
            storage_used=100,
        )

    def test_storage_counter_applies_deltas_without_scanning_files(self):
        self.assertEqual(adjust_storage_used(self.tenant, 50), 150)
        self.assertEqual(adjust_storage_used(self.tenant, -20), 130)

    def test_storage_counter_never_goes_below_zero(self):
        self.assertEqual(adjust_storage_used(self.tenant, -1000), 0)
