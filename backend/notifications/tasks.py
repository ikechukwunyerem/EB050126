# notifications/tasks.py
import logging
from typing import List, Optional

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


@shared_task(
    name="send_generic_email_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,           # exponential back-off: 60s, 120s, 240s
    retry_backoff_max=600,        # cap at 10 minutes
    retry_jitter=True,            # add randomness to prevent thundering-herd
)
def send_generic_email_task(
    self,
    subject: str,
    recipient_list: List[str],
    html_template_name: str,
    context: dict,
    text_template_name: Optional[str] = None,
    from_email: Optional[str] = None,
):
    """
    Central Celery task for sending all transactional emails.

    Renders an HTML template (and optional plain-text fallback) with the
    provided context, then sends via Django's email backend.

    Args:
        subject:            Email subject line.
        recipient_list:     List of recipient email addresses.
        html_template_name: Path to the HTML template (relative to TEMPLATES DIRS).
        context:            Template context dict.
        text_template_name: Optional path to a plain-text template. If omitted,
                            the plain-text body is auto-stripped from the HTML.
        from_email:         Sender address. Defaults to settings.DEFAULT_FROM_EMAIL.
    """
    sender = from_email or settings.DEFAULT_FROM_EMAIL

    try:
        # --- Render templates ---
        html_body = render_to_string(html_template_name, context)

        if text_template_name:
            text_body = render_to_string(text_template_name, context)
        else:
            # Auto-generate a plain-text fallback by stripping HTML tags.
            # This ensures every email has a readable text part even if no
            # .txt template exists yet.
            text_body = strip_tags(html_body)

        # --- Build and send the email ---
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=sender,
            to=recipient_list,
        )
        email.attach_alternative(html_body, 'text/html')
        email.send(fail_silently=False)

        logger.info(
            f"Email '{subject}' sent successfully to {recipient_list} "
            f"via template '{html_template_name}'"
        )
        return True

    except Exception as e:
        logger.error(
            f"Failed to send email '{subject}' to {recipient_list}: {e}",
            exc_info=True,
        )
        # autoretry_for handles the retry — just re-raise
        raise