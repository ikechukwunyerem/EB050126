# userauth/views.py
import logging
import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator

# Aliasing Google's transport so it doesn't shadow the standard `requests` library
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests

from rest_framework import generics, status, permissions, pagination
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Address, Profile
from .permissions import IsAddressOwner
from .serializers import (
    AddressSerializer, MyTokenObtainPairSerializer,
    ProfileSerializer, RegisterSerializer,
)
from .services import verify_email
from .tasks import send_verification_email_task, send_password_reset_email_task
from cart.models import Cart, CartItem

logger = logging.getLogger(__name__)
User = get_user_model()


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

from core.pagination import StandardResultsSetPagination


# ---------------------------------------------------------------------------
# Cart merge helper
# ---------------------------------------------------------------------------

def merge_guest_cart(request, user):
    """
    Merges a guest (session-based) cart into the authenticated user's cart on login.
    Fix #5 + #6: uses prefetch_related to avoid N+1 queries and wraps the entire
    operation in select_for_update() + atomic transaction to prevent race conditions
    from double-logins or simultaneous requests.
    """
    session_key = request.session.session_key
    if not session_key:
        return

    try:
        with Cart.objects.select_for_update().filter(
            session_key=session_key, user=None
        ):
            # Re-fetch inside atomic block with lock
            from django.db import transaction
            with transaction.atomic():
                try:
                    guest_cart = Cart.objects.select_for_update().prefetch_related(
                        'items__product'
                    ).get(session_key=session_key, user=None)
                except Cart.DoesNotExist:
                    return

                user_cart, _ = Cart.objects.get_or_create(user=user)

                for guest_item in guest_cart.items.all():
                    user_item, created = CartItem.objects.get_or_create(
                        cart=user_cart,
                        product=guest_item.product,
                    )
                    if not created:
                        user_item.quantity += guest_item.quantity
                    else:
                        user_item.quantity = guest_item.quantity
                    user_item.save()

                guest_cart.delete()
                logger.info(f"Guest cart merged into user cart for {user.email}")
    except Exception as e:
        # Cart merge is non-critical — log but never block login
        logger.error(f"Failed to merge guest cart for {user.email}: {e}", exc_info=True)


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Account created. Please check your email to verify your account."},
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, uidb64, token):
        user = verify_email(uidb64, token)
        if user:
            return Response(
                {"message": "Email verified successfully. You can now log in."},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": "Invalid or expired verification link."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class ResendVerificationEmailView(APIView):
    """
    Point #10: allows an authenticated but unverified user to request a new
    verification email. Rate-throttled to prevent abuse.
    Permission is AllowAny with an email lookup so users who can't log in
    (because is_active=False) can still trigger a resend.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'email_resend'  # Define "email_resend": "5/hour" in DRF THROTTLE_RATES

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)

            if user.email_verified:
                return Response(
                    {"message": "This email address is already verified."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            verification_link = user.get_verification_link(request)
            send_verification_email_task.delay(user.id, verification_link)
            logger.info(f"Resend verification email task dispatched for {user.email}")

        except User.DoesNotExist:
            # Don't reveal whether the email is registered
            pass
        except Exception as e:
            logger.error(f"Error resending verification for {email}: {e}", exc_info=True)

        # Always return a generic success message to prevent user enumeration
        return Response(
            {"message": "If an account with this email exists and is unverified, a new link has been sent."},
            status=status.HTTP_200_OK,
        )


class MyTokenObtainPairView(TokenObtainPairView):
    """Standard email/password login — merges guest cart on success."""
    serializer_class = MyTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Fix #9: the serializer already resolved the user — use it directly
            # instead of doing a redundant User.objects.get(email=...) query
            serializer = self.get_serializer(data=request.data)
            try:
                serializer.is_valid(raise_exception=False)
                if hasattr(serializer, 'user') and serializer.user:
                    merge_guest_cart(request, serializer.user)
            except Exception:
                pass  # Cart merge is non-critical

        return response


class GoogleLoginView(APIView):
    """Google OAuth login — validates token properly, offloads avatar download to Celery."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('credential')
        if not token:
            return Response({'error': 'No credential token provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Fix #3: always validate against GOOGLE_CLIENT_ID to prevent auth bypass
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                audience=settings.GOOGLE_CLIENT_ID,
            )

            # Fix #15: reject tokens where Google hasn't verified the email
            if not idinfo.get('email_verified'):
                return Response(
                    {'error': 'Google account email is not verified.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            email = idinfo.get('email', '').lower()
            if not email:
                return Response({'error': 'Could not retrieve email from Google token.'}, status=status.HTTP_400_BAD_REQUEST)

            user, created = User.objects.get_or_create(email=email)
            if created:
                user.set_unusable_password()
                user.first_name = idinfo.get('given_name', '')
                user.last_name = idinfo.get('family_name', '')
                # Google-authenticated users are verified immediately
                user.is_active = True
                user.email_verified = True
                user.save()
                logger.info(f"New user created via Google OAuth: {email}")

            # Fix #4: offload avatar download to Celery so the login response is instant
            picture_url = idinfo.get('picture')
            if picture_url:
                from .tasks import download_google_avatar_task
                download_google_avatar_task.delay(user.id, picture_url)

            merge_guest_cart(request, user)

            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'full_name': user.full_name,
                    'username': user.username,
                },
            }, status=status.HTTP_200_OK)

        except ValueError:
            return Response({'error': 'Invalid Google token.'}, status=status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Password Reset
# ---------------------------------------------------------------------------

class RequestPasswordResetView(APIView):
    """
    Point #11: initiates the password reset flow.
    Always returns 200 to prevent user enumeration.
    Rate-throttled to prevent brute-force abuse.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'  # Define "password_reset": "5/hour" in DRF THROTTLE_RATES

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        if not email:
            return Response({"error": "Email field is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            reset_url = self._build_reset_url(request, user)
            send_password_reset_email_task.delay(user.id, reset_url)
            logger.info(f"Password reset email task dispatched for {user.email}")
        except User.DoesNotExist:
            logger.info(f"Password reset requested for unregistered email: {email}")
        except Exception as e:
            logger.error(f"Error dispatching password reset for {email}: {e}", exc_info=True)

        return Response(
            {"message": "If an account with this email exists, a password reset link has been sent."},
            status=status.HTTP_200_OK,
        )

    def _build_reset_url(self, request, user):
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.urls import reverse
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        relative_url = reverse('userauth:password-reset-confirm', kwargs={'uidb64': uid, 'token': token})
        return request.build_absolute_uri(relative_url)


class PasswordResetConfirmView(APIView):
    """
    Point #11: validates the reset token and sets the new password.
    Fix #15 from example: imports Http404 correctly (was missing in example code).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = get_object_or_404(User, pk=uid)
        except (ValueError, TypeError, OverflowError, Http404):
            return Response(
                {"error": "Invalid password reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            logger.warning(f"Invalid or expired password reset token for user pk={uid}")
            return Response(
                {"error": "Invalid or expired password reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')

        if not new_password or not confirm_password:
            return Response(
                {"error": "Both 'password' and 'confirm_password' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response({"error": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            return Response({"errors": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        logger.info(f"Password successfully reset for {user.email}")
        return Response(
            {"message": "Password reset successfully. You can now log in."},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Address Book
# ---------------------------------------------------------------------------

class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination  # Point #12

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        address = serializer.save(user=self.request.user)
        logger.info(f"User {self.request.user.email} created address ID: {address.id}")


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated, IsAddressOwner]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        address = serializer.save()
        logger.info(f"User {self.request.user.email} updated address ID: {address.id}")

    def perform_destroy(self, instance):
        # Point #13: log both attempt and success for audit trail
        address_id = instance.id
        logger.info(f"User {self.request.user.email} deleting address ID: {address_id}")
        instance.delete()
        logger.info(f"User {self.request.user.email} deleted address ID: {address_id}")


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

class UserProfileView(generics.RetrieveUpdateAPIView):
    """Fetches and updates the logged-in user's profile."""
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Fix #11: signal guarantees a Profile always exists — use get() not get_or_create()
        return get_object_or_404(Profile, user=self.request.user)


# ---------------------------------------------------------------------------
# Import guard for settings
# ---------------------------------------------------------------------------
from django.conf import settings  # noqa: E402 — placed here to avoid circular at module load