# userauth/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    VerifyEmailView,
    ResendVerificationEmailView,
    MyTokenObtainPairView,
    GoogleLoginView,
    RequestPasswordResetView,
    PasswordResetConfirmView,
    AddressListCreateView,
    AddressDetailView,
    UserProfileView,
)

# This app_name is required for reverse() calls like:
#   reverse('userauth:verify-email', kwargs={...})
# used in User.get_verification_link() and RequestPasswordResetView.
app_name = 'userauth'

urlpatterns = [
    # --- Registration & Email Verification ---
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/<str:uidb64>/<str:token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationEmailView.as_view(), name='resend-verification'),

    # --- Login / Token ---
    path('login/', MyTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('google/', GoogleLoginView.as_view(), name='google-login'),

    # --- Password Reset ---
    path('password-reset/', RequestPasswordResetView.as_view(), name='password-reset'),
    path(
        'password-reset/<str:uidb64>/<str:token>/',
        PasswordResetConfirmView.as_view(),
        name='password-reset-confirm',
    ),

    # --- Profile ---
    path('profile/', UserProfileView.as_view(), name='profile'),

    # --- Address Book ---
    path('addresses/', AddressListCreateView.as_view(), name='address-list-create'),
    path('addresses/<int:pk>/', AddressDetailView.as_view(), name='address-detail'),
]