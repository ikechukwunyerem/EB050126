# userauth/services.py
import logging
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from .signals import email_verified as email_verified_signal

User = get_user_model()
logger = logging.getLogger(__name__)


def verify_email(uidb64: str, token: str):
    """
    Decodes the UID and token from a verification link, validates them,
    and activates the user's account on success.

    Returns the User instance on success, or None on any failure.
    """
    user = None
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        logger.warning(f"Email verification failed: invalid UID '{uidb64}'.")
        return None

    if not default_token_generator.check_token(user, token):
        logger.warning(f"Email verification failed for {user.email}: invalid or expired token.")
        return None

    # Activate the account — both fields must be set for login to succeed
    user.email_verified = True
    user.is_active = True
    user.save(update_fields=['email_verified', 'is_active'])
    logger.info(f"Email verified and account activated for {user.email}")

    # Notify other apps (e.g. newsletter auto-subscribe) without coupling to them
    email_verified_signal.send(sender=user.__class__, user=user)

    return user