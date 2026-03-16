# cart/models.py
from decimal import Decimal
from django.db import models
from django.conf import settings


class Cart(models.Model):
    """
    Represents a shopping cart for either an authenticated user or an
    anonymous guest (identified by Django session key).

    Rules:
    - Authenticated users: identified by `user` FK. `session_key` is null.
    - Guest users:         identified by `session_key`. `user` is null.
    - On login:            the guest cart is merged into the user cart and
                           the guest cart is deleted. This is handled
                           atomically in userauth/views.py (merge_guest_cart).
    - On payment:          the user cart is deleted in the Paystack webhook
                           handler AFTER payment is confirmed — never before.

    Constraints prevent a user from having more than one cart and a session
    from having more than one guest cart.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='cart',
    )
    session_key = models.CharField(
        max_length=40,
        null=True,
        blank=True,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # One cart per authenticated user
            models.UniqueConstraint(
                fields=['user'],
                condition=models.Q(user__isnull=False),
                name='unique_cart_per_user',
            ),
            # One cart per guest session
            models.UniqueConstraint(
                fields=['session_key'],
                condition=models.Q(session_key__isnull=False, user__isnull=True),
                name='unique_cart_per_session',
            ),
        ]

    def __str__(self):
        if self.user:
            return f'Cart ({self.user.email})'
        return f'Guest Cart ({self.session_key})'

    @property
    def total_items(self) -> int:
        """Total number of individual units across all line items."""
        return sum(item.quantity for item in self.items.all())

    @property
    def grand_total(self) -> Decimal:
        """
        Sum of all item subtotals.
        Relies on prefetch_related('items__product') being applied on the
        queryset (done in CartAPIView._get_cart) to avoid N+1 queries.
        """
        return sum(item.subtotal for item in self.items.all())


class CartItem(models.Model):
    """
    A single product line in a cart.
    quantity is validated in CartAPIView (min=1, max=99) — not at model level,
    because the model doesn't know the UI context (add vs set).
    """
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
    )
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # A product can only appear once per cart — quantities are accumulated
        unique_together = ('cart', 'product')
        ordering = ['added_at']

    def __str__(self):
        return f'{self.quantity} × {self.product.name} in {self.cart}'

    @property
    def subtotal(self) -> Decimal:
        return self.product.price * self.quantity