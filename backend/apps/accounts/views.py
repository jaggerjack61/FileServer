import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .serializers import (
    AuthResponseSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    """POST /api/auth/register/"""

    permission_classes = [AllowAny]
    throttle_scope = "anon"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            AuthResponseSerializer.build(user),
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """POST /api/auth/login/"""

    permission_classes = [AllowAny]
    throttle_scope = "anon"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        logger.info("User logged in: %s", user.email)
        return Response(AuthResponseSerializer.build(user))


class RefreshTokenView(APIView):
    """POST /api/auth/refresh/"""

    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            return Response(
                {
                    "access": str(token.access_token),
                    "refresh": str(token),
                }
            )
        except TokenError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class LogoutView(APIView):
    """POST /api/auth/logout/ – blacklist refresh token."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Successfully logged out."})
        except TokenError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MeView(APIView):
    """GET /api/auth/me/ – current user profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
