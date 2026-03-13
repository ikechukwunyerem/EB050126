# orders/models.py
import uuid
from django.db import models
from django.conf import settings
from products.models import Product
from django.utils.translation import gettext_lazy as _
from userauth.models import Address

ORDER_STATUS_CHOICES = [
    ('pending', 'Pending (Unpaid)'),
    ('processing', 'Processing (Paid)'),
    ('shipped', 'Shipped'),
    ('delivered', 'Delivered'),
    ('cancelled', 'Cancelled'),
]

# FIX #12: Explicit payment status choices to replace the loose CharField default
PAYMENT_STATUS_CHOICES = [
    ('unpaid', 'Unpaid'),
    ('paid', 'Paid'),
    ('refunded', 'Refunded'),
    ('failed', 'Failed'),
]

class Order(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders')
    order_number = models.CharField(max_length=100, unique=True, blank=True)
    
    shipping_address = models.ForeignKey(
        Address,
        on_delete=models.PROTECT,
        related_name='orders',
        null=True,
        blank=True,
        help_text=_("The saved address used for this delivery")
    )
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # FIX #12: Removed redundant `is_paid` BooleanField. Derive it from payment_status
    # to prevent the two fields from drifting out of sync.
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='unpaid',
        db_index=True,
    )
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    # FIX #12: is_paid derived as a property — single source of truth
    @property
    def is_paid(self):
        return self.payment_status == 'paid'

    def save(self, *args, **kwargs):
        # FIX #3: Auto-generate order_number before first save so the unique
        # constraint is never violated by a blank string collision.
        if not self.order_number:
            self.order_number = self._generate_order_number()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_order_number():
        """Generates a short, URL-safe unique order number, e.g. ORD-A1B2C3D4."""
        return f"ORD-{uuid.uuid4().hex[:8].upper()}"

    def __str__(self):
        return f"Order {self.order_number} - {self.user.email}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # price_at_purchase
    quantity = models.PositiveIntegerField(default=1)

    @property
    def subtotal(self):
        return self.price * self.quantity