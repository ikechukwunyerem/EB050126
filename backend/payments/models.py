# payments/models.py
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

GATEWAY_CHOICES = [
    ('paystack', 'Paystack'),       # FIX #1: Added Paystack (was missing entirely)
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
    
    # FIX #1: Default is now 'paystack' to match the actual integration
    gateway = models.CharField(max_length=20, choices=GATEWAY_CHOICES, default='paystack')
    gateway_reference = models.CharField(max_length=100, unique=True, help_text=_("e.g., your generated tx_ref"))
    gateway_transaction_id = models.CharField(max_length=100, blank=True, null=True, help_text=_("e.g., the ID Paystack returns"))
    
    # FIX #5: Replaced manual GFK pattern with explicit nullable FKs per purpose type.
    # This gives you ORM traversal, admin integration, and referential integrity.
    # Both are nullable so only one is populated at a time depending on 'purpose'.
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, db_index=True)
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='transactions',
        help_text=_("Populated when purpose='order'")
    )
    subscription = models.ForeignKey(
        'subscriptions.UserSubscription',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='transactions',
        help_text=_("Populated when purpose='subscription'")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.purpose == 'order' and not self.order_id:
            raise ValidationError("An 'order' transaction must link to an Order.")
        if self.purpose == 'subscription' and not self.subscription_id:
            raise ValidationError("A 'subscription' transaction must link to a UserSubscription.")

    def __str__(self):
        return f"{self.gateway_reference} - {self.amount} {self.currency} [{self.status}]"


class WebhookLog(models.Model):
    """Stores raw payloads from payment gateways before processing to prevent data loss."""
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