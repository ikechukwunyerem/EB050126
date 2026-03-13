# userauth/tasks.py
import logging
import uuid

import requests
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.utils import timezone

# Points #16 & #17: delegate actual email sending to a shared notifications task.
# This centralises HTML template rendering, from-address config, and text fallbacks.
# You will need to create a `notifications` app with a `send_generic_email_task`.
from notifications.tasks import send_generic_email_task

User = get_user_model()
logger = logging.getLogger(__name__)

# Common context variables included in every email (point #17)
def _base_email_context():
    return {
        'site_name': getattr(settings, 'APP_DISPLAY_NAME', 'Efiko'),
        'frontend_base_url': getattr(settings, 'FRONTEND_URL', '').rstrip('/'),
        'support_email': getattr(settings, 'SUPPORT_EMAIL', settings.DEFAULT_FROM_EMAIL),
        'year': timezone.now().year,
    }


@shared_task(name="send_verification_email_task", bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email_task(self, user_id: int, verification_link: str):
    """Dispatches the email verification link to the user via the generic email task."""
    try:
        user = User.objects.get(pk=user_id)
        context = {
            **_base_email_context(),
            'user_full_name': user.full_name or user.email,
            'verification_link': verification_link,
        }
        send_generic_email_task.delay(
            subject="Verify Your Efiko Account",
            html_template_name="emails/verification_email.html",
            text_template_name="emails/verification_email.txt",
            context=context,
            recipient_list=[user.email],
        )
        logger.info(f"Verification email task dispatched for {user.email}")
        return True
    except User.DoesNotExist:
        # Point #12 from original review: don't retry if the user no longer exists
        logger.error(f"User ID {user_id} not found — aborting verification email.")
        return False
    except Exception as e:
        logger.error(f"Error in send_verification_email_task for user_id={user_id}: {e}", exc_info=True)
        raise self.retry(exc=e)


@shared_task(name="send_password_reset_email_task", bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email_task(self, user_id: int, reset_url: str):
    """Dispatches the password reset link to the user via the generic email task."""
    try:
        user = User.objects.get(pk=user_id)
        context = {
            **_base_email_context(),
            'user_full_name': user.full_name or user.email,
            'reset_url': reset_url,
            'expires_in': f"{getattr(settings, 'PASSWORD_RESET_TIMEOUT_HOURS', 1)} hour(s)",
        }
        send_generic_email_task.delay(
            subject="Reset Your Efiko Password",
            html_template_name="emails/password_reset.html",
            text_template_name="emails/password_reset.txt",
            context=context,
            recipient_list=[user.email],
        )
        logger.info(f"Password reset email task dispatched for {user.email}")
        return True
    except User.DoesNotExist:
        logger.error(f"User ID {user_id} not found — aborting password reset email.")
        return False
    except Exception as e:
        logger.error(f"Error in send_password_reset_email_task for user_id={user_id}: {e}", exc_info=True)
        raise self.retry(exc=e)


@shared_task(name="download_google_avatar_task", bind=True, max_retries=2, default_retry_delay=30)
def download_google_avatar_task(self, user_id: int, picture_url: str):
    """
    Fix #4: downloads the Google profile picture in the background so the
    OAuth login response is returned immediately without waiting on an
    external HTTP request.
    """
    try:
        user = User.objects.get(pk=user_id)
        profile = user.profile

        # Only download if the user still has the default/placeholder image
        if profile.image and 'default' not in getattr(profile.image, 'name', 'default'):
            logger.info(f"User {user.email} already has a custom avatar — skipping download.")
            return True

        img_response = requests.get(picture_url, stream=True, timeout=10)
        if img_response.status_code == 200:
            image_name = f"{user.id}_google_{uuid.uuid4().hex[:6]}.jpg"
            profile.image.save(image_name, ContentFile(img_response.content), save=True)
            logger.info(f"Google avatar saved for {user.email}")
        else:
            logger.warning(
                f"Failed to download Google avatar for {user.email} "
                f"— HTTP {img_response.status_code}"
            )
        return True

    except User.DoesNotExist:
        logger.error(f"User ID {user_id} not found — aborting avatar download.")
        return False
    except Exception as e:
        logger.error(f"Error downloading avatar for user_id={user_id}: {e}", exc_info=True)
        raise self.retry(exc=e)