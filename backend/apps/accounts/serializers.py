import logging

from django.contrib.auth import authenticate
from django.utils.text import slugify
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Tenant
from apps.tenants.serializers import TenantBriefSerializer, TenantDetailSerializer

from .models import User

logger = logging.getLogger(__name__)


class UserBriefSerializer(serializers.ModelSerializer):
    """Compact user representation for nested responses (file owner, etc.)."""

    class Meta:
        model = User
        fields = ["id", "email", "username"]


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    tenant_name = serializers.CharField(max_length=255)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def create(self, validated_data):
        tenant_name = validated_data.pop("tenant_name")

        # Create tenant
        slug = slugify(tenant_name)
        # Ensure unique slug
        base_slug = slug
        counter = 1
        while Tenant.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        # Create user first (without tenant)
        user = User.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=validated_data["password"],
            role="admin",
        )

        # Create tenant with user as owner
        tenant = Tenant.objects.create(name=tenant_name, slug=slug, owner=user)

        # Assign tenant to user
        user.tenant = tenant
        user.save(update_fields=["tenant"])

        logger.info("User registered: %s (tenant: %s)", user.email, tenant.slug)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["email"],
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")
        attrs["user"] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Full profile for /api/auth/me/ endpoint."""

    tenant = TenantDetailSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "username", "role", "is_superuser", "tenant"]


class AuthResponseSerializer(serializers.Serializer):
    """Builds JWT + user payload for login/register responses."""

    @staticmethod
    def build(user: User) -> dict:
        refresh = RefreshToken.for_user(user)
        tenant_data = None
        if user.tenant:
            tenant_data = TenantBriefSerializer(user.tenant).data
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "role": user.role,
                "is_superuser": user.is_superuser,
                "tenant": tenant_data,
            },
        }
