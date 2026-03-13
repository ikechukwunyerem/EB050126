# newsletter/models.py
import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class NewsletterSubscriber(models.Model):
    """
    Represents a newsletter subscriber — either an anonymous email address
    or a linked registered user.

    unsubscribe_token is a UUID used in one-click unsubscribe links instead
    of exposing the raw email address in URLs (which is spoofable).
    """
    email = models.EmailField(
        unique=True,
        verbose_name=_('Email Address'),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='newsletter_subscriptions',
        verbose_name=_('Associated User'),
        help_text=_('Set automatically when a registered user subscribes.'),
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Is Active'),
        help_text=_('Uncheck to unsubscribe without deleting the record.'),
    )

    # Used for one-click unsubscribe links — never expose raw email in URLs
    unsubscribe_token = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        help_text=_('Used to generate safe one-click unsubscribe links.'),
    )

    subscribed_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Subscribed At'))
    unsubscribed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Unsubscribed At'),
    )

    class Meta:
        verbose_name = _('Newsletter Subscriber')
        verbose_name_plural = _('Newsletter Subscribers')
        ordering = ['-subscribed_at']

    def __str__(self):
        return self.email


class NewsletterIssue(models.Model):
    """
    A single newsletter edition. Content is stored as HTML directly.
    Scheduling is handled by Celery Beat polling scheduled_send_time.

    is_sent and sent_at are managed exclusively by send_newsletter_issue_task
    and are editable=False to prevent accidental admin overrides.
    """
    subject = models.CharField(max_length=255, verbose_name=_('Subject'))
    html_content = models.TextField(
        verbose_name=_('HTML Content'),
        help_text=_('Full HTML content of the newsletter.'),
    )
    plain_text_content = models.TextField(
        blank=True,
        verbose_name=_('Plain Text Content'),
        help_text=_('Optional. If blank, auto-stripped from HTML when sending.'),
    )
    scheduled_send_time = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Scheduled Send Time'),
        help_text=_('Celery Beat will dispatch the send task at or after this time.'),
    )

    # Both fields owned by the Celery task — never edited manually
    is_sent = models.BooleanField(default=False, editable=False, verbose_name=_('Is Sent'))
    sent_at = models.DateTimeField(null=True, blank=True, editable=False, verbose_name=_('Sent At'))

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Created At'))

    class Meta:
        verbose_name = _('Newsletter Issue')
        verbose_name_plural = _('Newsletter Issues')
        ordering = ['-created_at']

    def __str__(self):
        return self.subject