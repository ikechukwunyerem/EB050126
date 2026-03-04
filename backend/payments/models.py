# payments/models.py
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

GATEWAY_CHOICES = [
    ('flutterwave', 'Flutterwave'),
    ('stripe', 'Stripe'),
    ('paypal', 'PayPal'),
]

PAYMENT_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('successful', 'Successful'),
    ('failed', 'Failed'),
    ('cancelled', 'Cancelled'),
]

PURPOSE_CHOICES = [
    ('subscription', 'Subscription'),
    ('order', 'Product Order'),
]

class PaymentTransaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='transactions')
    
    # Standardized Ledger
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='NGN', help_text=_("3-letter ISO code"))
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # Gateway Specifics
    gateway = models.CharField(max_length=20, choices=GATEWAY_CHOICES, default='flutterwave')
    gateway_reference = models.CharField(max_length=100, unique=True, help_text=_("e.g., your generated tx_ref"))
    gateway_transaction_id = models.CharField(max_length=100, blank=True, null=True, help_text=_("e.g., the ID Flutterwave returns"))
    
    # Decoupled Target (What are they paying for?)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, db_index=True)
    purpose_id = models.PositiveIntegerField(db_index=True, help_text=_("ID of the Subscription or Order"))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.gateway_reference} - {self.amount} {self.currency} [{self.status}]"


class WebhookLog(models.Model):
    """Stores raw payloads from Flutterwave/Stripe before processing to prevent data loss"""
    gateway = models.CharField(max_length=20, choices=GATEWAY_CHOICES)
    payload = models.TextField(help_text=_("Raw JSON body from the provider"))
    headers = models.JSONField(blank=True, null=True)
    status = models.CharField(max_length=20, default='unprocessed', help_text=_("unprocessed, processed, or error"))
    
    processing_notes = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.gateway} Webhook at {self.received_at}"