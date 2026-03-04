import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with UUID primary key and tenant association."""

    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("user", "User"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="user")
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="members",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self):
        return self.email
