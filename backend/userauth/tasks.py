# userauth/tasks.py
import logging
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

User = get_user_model()
logger = logging.getLogger(__name__)

@shared_task(name="send_verification_email_task", bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email_task(self, user_id: int, verification_link: str):
    """
    Asynchronously sends the email verification link to the user.
    """
    try:
        user = User.objects.get(pk=user_id)
        subject = "Verify Your Efiko Account"
        
        # A clean, text-based email fallback. 
        message = (
            f"Hello {user.first_name or 'there'},\n\n"
            f"Welcome to Efiko! Please verify your email address to activate your account by clicking the link below:\n\n"
            f"{verification_link}\n\n"
            f"If you did not create this account, you can safely ignore this email."
        )
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        logger.info(f"Task: Verification email dispatched successfully to {user.email}")
        return True
        
    except User.DoesNotExist:
        logger.error(f"Task: User with ID {user_id} not found. Aborting email send.")
        return False
    except Exception as e:
        logger.error(f"Task: SMTP error sending email to user_id {user_id}: {e}", exc_info=True)
        # Instruct Celery to retry the task if the email server fails
        raise self.retry(exc=e)