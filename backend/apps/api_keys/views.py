from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TenantAPIKey
from .serializers import APIKeyCreateSerializer, APIKeyListSerializer, APIKeyResponseSerializer


class APIKeyListCreateView(APIView):
    """
    GET  /api/apikeys/  – list keys for current tenant
    POST /api/apikeys/  – create a new key
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.user.tenant
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)
        keys = TenantAPIKey.objects.filter(tenant=tenant).order_by("-created")
        serializer = APIKeyListSerializer(keys, many=True)
        return Response({
            "count": keys.count(),
            "next": None,
            "previous": None,
            "results": serializer.data,
        })

    def post(self, request):
        tenant = request.user.tenant
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)

        serializer = APIKeyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # create_key returns (api_key_instance, raw_key_string)
        api_key, raw_key = TenantAPIKey.objects.create_key(
            name=serializer.validated_data["name"],
            tenant=tenant,
            permissions=serializer.validated_data.get("permissions", ["read"]),
        )

        # Build response with raw key shown once
        data = APIKeyResponseSerializer(api_key).data
        data["key"] = raw_key
        return Response(data, status=status.HTTP_201_CREATED)


class APIKeyDeleteView(APIView):
    """DELETE /api/apikeys/{id}/ – revoke an API key."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, prefix):
        tenant = request.user.tenant
        if not tenant:
            return Response({"detail": "No tenant associated."}, status=status.HTTP_403_FORBIDDEN)
        try:
            api_key = TenantAPIKey.objects.get(prefix=prefix, tenant=tenant)
        except TenantAPIKey.DoesNotExist:
            return Response({"detail": "API key not found."}, status=status.HTTP_404_NOT_FOUND)

        api_key.revoked = True
        api_key.save(update_fields=["revoked"])
        return Response(status=status.HTTP_204_NO_CONTENT)
