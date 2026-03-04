# subscriptions/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.utils.text import slugify

CURRENCY_CHOICES = [
    ('NGN', 'Nigerian Naira'),
    ('USD', 'US Dollar'),
]

SUBSCRIPTION_STATUS_CHOICES = [
    ('active', 'Active'),
    ('past_due', 'Past Due'),
    ('canceled', 'Canceled'),
    ('expired', 'Expired'),
]

class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True)
    description = models.TextField(blank=True)
    duration_days = models.PositiveIntegerField(default=30, help_text=_("Duration in days (e.g., 30 for monthly, 365 for annual)"))
    is_active = models.BooleanField(default=True, help_text=_("Can users currently buy this plan?"))

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class PlanPrice(models.Model):
    """Allows a single plan to have prices in multiple currencies."""
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE, related_name='prices')
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='NGN')
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('plan', 'currency')

    def __str__(self):
        return f"{self.plan.name} - {self.amount} {self.currency}"

class UserSubscription(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=SUBSCRIPTION_STATUS_CHOICES, default='expired')
    
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    
    cancel_at_period_end = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_valid(self):
        """Helper property to instantly check if access should be granted."""
        if self.status == 'active' and self.current_period_end:
            return self.current_period_end > timezone.now()
        return False

    def __str__(self):
        return f"{self.user.email} - {self.plan.name} ({self.status})"