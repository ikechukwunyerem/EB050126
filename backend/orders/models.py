# orders/models.py
from django.db import models
from django.conf import settings
from products.models import Product
from django.utils.translation import gettext_lazy as _

ORDER_STATUS_CHOICES = [
    ('pending', 'Pending (Unpaid)'),
    ('processing', 'Processing (Paid)'),
    ('shipped', 'Shipped'),
    ('delivered', 'Delivered'),
    ('cancelled', 'Cancelled'),
]

class Order(models.Model):
    # Strictly enforcing login for checkout
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders')
    
    # Basic Shipping Details (Nigeria-first approach)
    shipping_address = models.TextField(blank=True, help_text=_("Required for physical products"))
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Nigeria')
    
    # Financials
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_paid = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id} - {self.user.email}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    
    # We MUST save the price at the moment of purchase, independent of the Product model
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    @property
    def subtotal(self):
        return self.price_at_purchase * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.product.name} (Order #{self.order.id})"