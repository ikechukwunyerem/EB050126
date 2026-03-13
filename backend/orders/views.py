# orders/views.py
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, generics
from django.db import transaction

from .models import Order, OrderItem
from cart.models import Cart
from userauth.models import Address
from products.models import Product
from .serializers import OrderSerializer
from core.pagination import StandardResultsSetPagination

logger = logging.getLogger(__name__)


class CheckoutAPIView(APIView):
    """
    POST /orders/checkout/

    Converts the authenticated user's cart into a confirmed Order.
    Payment is handled separately by payments/views.py.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        address_id = request.data.get('address_id')

        # ---------------------------------------------------------------- #
        # 1. Fetch cart with items pre-loaded to avoid N+1               #
        # Issue #9: select_related('product') prevents per-item queries   #
        # ---------------------------------------------------------------- #
        try:
            cart = (
                Cart.objects
                .prefetch_related('items__product')
                .get(user=request.user)
            )
        except Cart.DoesNotExist:
            return Response(
                {'error': 'No active cart found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        cart_items = list(cart.items.all())  # evaluate once, reuse below
        if not cart_items:
            return Response({'error': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # ---------------------------------------------------------------- #
        # 2. Validate address                                              #
        # ---------------------------------------------------------------- #
        address = None
        if address_id:
            try:
                address = Address.objects.get(id=address_id, user=request.user)
            except Address.DoesNotExist:
                return Response(
                    {'error': 'Invalid address selection.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ---------------------------------------------------------------- #
        # 3. Stock checks (physical products only)                        #
        # Issue #4: validate stock before touching any DB rows            #
        # ---------------------------------------------------------------- #
        stock_errors = []
        for item in cart_items:
            product = item.product
            if product.product_type == 'physical':
                if not product.is_active:
                    stock_errors.append(f'"{product.name}" is no longer available.')
                elif product.stock < item.quantity:
                    stock_errors.append(
                        f'"{product.name}" only has {product.stock} unit(s) in stock '
                        f'(you requested {item.quantity}).'
                    )

        if stock_errors:
            return Response({'errors': stock_errors}, status=status.HTTP_400_BAD_REQUEST)

        # ---------------------------------------------------------------- #
        # 4. Lock product rows and decrement stock atomically             #
        # ---------------------------------------------------------------- #
        physical_items = [i for i in cart_items if i.product.product_type == 'physical']
        if physical_items:
            product_ids = [i.product_id for i in physical_items]
            # Lock rows for the duration of this transaction
            locked_products = {
                p.id: p
                for p in Product.objects.select_for_update().filter(id__in=product_ids)
            }
            for item in physical_items:
                product = locked_products[item.product_id]
                # Re-check under lock in case stock changed between check and lock
                if product.stock < item.quantity:
                    return Response(
                        {'error': f'"{product.name}" is out of stock. Please update your cart.'},
                        status=status.HTTP_409_CONFLICT,
                    )
                product.stock -= item.quantity
                product.save(update_fields=['stock'])

        # ---------------------------------------------------------------- #
        # 5. Create Order                                                  #
        # Issue #3: order_number NOT passed here — Order.save() generates  #
        # it automatically. Passing it would bypass model-level logic.    #
        # ---------------------------------------------------------------- #
        order = Order.objects.create(
            user=request.user,
            shipping_address=address,
            total_amount=0,      # set below from snapshotted prices
            status='pending',
            payment_status='unpaid',
        )

        # ---------------------------------------------------------------- #
        # 6. Snapshot prices into OrderItems                              #
        # Issue #10: total_amount derived from snapshotted item prices,   #
        # not from live product.price, so it can never drift.             #
        # ---------------------------------------------------------------- #
        order_items = [
            OrderItem(
                order=order,
                product=item.product,
                price=item.product.price,    # snapshot price at purchase time
                quantity=item.quantity,
            )
            for item in cart_items
        ]
        OrderItem.objects.bulk_create(order_items)

        # Derive total from the snapshotted prices, not from cart
        total_amount = sum(oi.price * oi.quantity for oi in order_items)
        order.total_amount = total_amount
        order.save(update_fields=['total_amount'])

        # ---------------------------------------------------------------- #
        # 7. DO NOT clear the cart here                                   #
        # Issue #18: cart is cleared in the webhook after payment is      #
        # confirmed, not here. If the user abandons payment, their cart   #
        # should still be intact.                                          #
        # ---------------------------------------------------------------- #

        logger.info(
            f'Order {order.order_number} created for {request.user.email} '
            f'— total: {order.total_amount} NGN'
        )

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OrderListView(generics.ListAPIView):
    """GET /orders/ — paginated list of the authenticated user's orders."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return (
            Order.objects
            .filter(user=self.request.user)
            .prefetch_related('items__product')
            .select_related('shipping_address')
            .order_by('-created_at')
        )


class OrderDetailView(generics.RetrieveAPIView):
    """GET /orders/{order_number}/ — retrieve a single order."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'order_number'

    def get_queryset(self):
        return (
            Order.objects
            .filter(user=self.request.user)
            .prefetch_related('items__product')
            .select_related('shipping_address')
        )