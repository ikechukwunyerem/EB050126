# orders/models.py
from django.db import models
from django.conf import settings
from products.models import Product
from django.utils.translation import gettext_lazy as _
from userauth.models import Address  # Ensure this matches your userauth path

ORDER_STATUS_CHOICES = [
    ('pending', 'Pending (Unpaid)'),
    ('processing', 'Processing (Paid)'),
    ('shipped', 'Shipped'),
    ('delivered', 'Delivered'),
    ('cancelled', 'Cancelled'),
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
    is_paid = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, default='unpaid') # Added for Paystack sync
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.order_number} - {self.user.email}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    price = models.DecimalField(max_digits=10, decimal_places=2) # price_at_purchase
    quantity = models.PositiveIntegerField(default=1)

    @property
    def subtotal(self):
        return self.price * self.quantity