# userauth/services.py
import logging
from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator

User = get_user_model()
logger = logging.getLogger(__name__)

def verify_email(uidb64, token):
    """
    Decodes the uid/token, verifies it against the user, 
    and activates the account upon success.
    """
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        logger.warning(f"Email verification failed: Invalid UID '{uidb64}'.")
        return None

    if user is not None and default_token_generator.check_token(user, token):
        # The token matches. Activate the user.
        user.email_verified = True
        user.is_active = True
        user.save(update_fields=['email_verified', 'is_active'])
        logger.info(f"Email verified successfully for user {user.email}")
        return user

    logger.warning(f"Email verification failed for user {user.email if user else 'Unknown'} due to an invalid token.")
    return None