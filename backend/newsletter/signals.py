# newsletter/signals.py
import logging
from django.dispatch import receiver

# Import the custom signal fired by userauth after email verification succeeds.
# This decouples the newsletter app from userauth — userauth never imports newsletter.
from userauth.signals import email_verified

logger = logging.getLogger(__name__)


@receiver(email_verified)
def auto_subscribe_verified_user(sender, user, **kwargs):
    """
    Automatically subscribes a user to the newsletter when they verify
    their email address.

    Logic:
    - If an active subscriber row already exists for this email, do nothing
      (handles edge case where the user subscribed before registering).
    - If an inactive row exists, reactivate it and link the user account.
    - If no row exists, create a new active subscriber.

    This fulfils the placeholder comment in userauth/models.py (point #8).
    """
    from .models import NewsletterSubscriber

    email = user.email.lower().strip()

    try:
        existing = NewsletterSubscriber.objects.filter(email=email).first()

        if existing:
            if existing.is_active:
                # Already subscribed (e.g. subscribed anonymously before registering)
                # Link the user account if not already linked
                if not existing.user:
                    existing.user = user
                    existing.save(update_fields=['user'])
                return
            else:
                # Reactivate lapsed subscription and link user
                existing.is_active = True
                existing.unsubscribed_at = None
                existing.user = user
                existing.save(update_fields=['is_active', 'unsubscribed_at', 'user'])
                logger.info('Newsletter: reactivated subscriber for verified user %s', email)
                return

        # No existing row — create fresh
        NewsletterSubscriber.objects.create(email=email, user=user)
        logger.info('Newsletter: auto-subscribed verified user %s', email)

    except Exception:
        # Signal failures must never break the email verification flow
        logger.exception('Newsletter: auto_subscribe_verified_user failed for %s', email)