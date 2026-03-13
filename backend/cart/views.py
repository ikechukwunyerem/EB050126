# cart/views.py
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import Cart, CartItem
from products.models import Product
from .serializers import CartSerializer

logger = logging.getLogger(__name__)

# Maximum quantity allowed per line item
MAX_ITEM_QUANTITY = 99


class CartAPIView(APIView):
    """
    Handles all cart operations for both authenticated users and guests.

    GET    /cart/          — retrieve current cart
    POST   /cart/          — add item or set quantity
    PATCH  /cart/          — update a specific item's quantity  (Issue #12)
    DELETE /cart/          — remove a specific item             (Issue #12)
    """
    permission_classes = [permissions.AllowAny]

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _get_cart(self, request):
        """
        Returns the cart for the current user/session.
        Issue #17: only uses get_or_create on mutation endpoints (POST/PATCH/DELETE).
        On GET we return None if no cart exists rather than creating an empty one.
        """
        if request.user.is_authenticated:
            return Cart.objects.filter(user=request.user).prefetch_related(
                'items__product'
            ).first()
        else:
            session_key = request.session.session_key
            if not session_key:
                return None
            return Cart.objects.filter(
                session_key=session_key, user=None
            ).prefetch_related('items__product').first()

    def _get_or_create_cart(self, request):
        """Creates cart if it doesn't exist yet. Called only on mutations."""
        if request.user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=request.user)
        else:
            if not request.session.session_key:
                request.session.create()
            cart, _ = Cart.objects.get_or_create(
                session_key=request.session.session_key,
                user=None,
            )
        return cart

    # ------------------------------------------------------------------ #
    # GET — retrieve cart
    # ------------------------------------------------------------------ #

    def get(self, request):
        """Issue #17: returns empty cart shape without creating a DB row."""
        cart = self._get_cart(request)
        if not cart:
            return Response({'id': None, 'items': [], 'total_items': 0, 'grand_total': '0.00'})
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    # ------------------------------------------------------------------ #
    # POST — add item or increment quantity
    # ------------------------------------------------------------------ #

    def post(self, request):
        """
        Add a product to the cart or increment its quantity.

        Body: { product_id: int, quantity: int (optional, default 1) }
        """
        product_id = request.data.get('product_id')
        if not product_id:
            return Response(
                {'error': 'product_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Issue #20: guard int cast against non-numeric input
        try:
            quantity = int(request.data.get('quantity', 1))
        except (ValueError, TypeError):
            return Response(
                {'error': 'quantity must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Issue #5: reject non-positive quantities on add
        if quantity < 1:
            return Response(
                {'error': 'quantity must be at least 1.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        cart = self._get_or_create_cart(request)
        cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)

        new_quantity = quantity if created else cart_item.quantity + quantity

        # Issue #5: enforce upper bound
        if new_quantity > MAX_ITEM_QUANTITY:
            return Response(
                {'error': f'Cannot exceed {MAX_ITEM_QUANTITY} units per item.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart_item.quantity = new_quantity
        cart_item.save(update_fields=['quantity'])

        cart.refresh_from_db()
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------ #
    # PATCH — set a specific item to an exact quantity
    # ------------------------------------------------------------------ #

    def patch(self, request):
        """
        Issue #12: update a cart item to an exact quantity.
        Sending quantity=0 removes the item (Issue #11).

        Body: { cart_item_id: int, quantity: int }
        """
        cart_item_id = request.data.get('cart_item_id')
        if not cart_item_id:
            return Response(
                {'error': 'cart_item_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quantity = int(request.data.get('quantity'))
        except (ValueError, TypeError):
            return Response(
                {'error': 'quantity must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity < 0:
            return Response(
                {'error': 'quantity cannot be negative.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity > MAX_ITEM_QUANTITY:
            return Response(
                {'error': f'Cannot exceed {MAX_ITEM_QUANTITY} units per item.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart = self._get_cart(request)
        if not cart:
            return Response({'error': 'No active cart.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            cart_item = cart.items.select_related('product').get(id=cart_item_id)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found in cart.'}, status=status.HTTP_404_NOT_FOUND)

        # Issue #11: quantity=0 means remove
        if quantity == 0:
            cart_item.delete()
            logger.info(f'Cart item {cart_item_id} removed (quantity set to 0).')
        else:
            cart_item.quantity = quantity
            cart_item.save(update_fields=['quantity'])

        cart.refresh_from_db()
        return Response(CartSerializer(cart).data)

    # ------------------------------------------------------------------ #
    # DELETE — remove a specific item entirely
    # ------------------------------------------------------------------ #

    def delete(self, request):
        """
        Issue #12: remove an item from the cart entirely.

        Body: { cart_item_id: int }
        """
        cart_item_id = request.data.get('cart_item_id')
        if not cart_item_id:
            return Response(
                {'error': 'cart_item_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart = self._get_cart(request)
        if not cart:
            return Response({'error': 'No active cart.'}, status=status.HTTP_404_NOT_FOUND)

        deleted, _ = cart.items.filter(id=cart_item_id).delete()
        if not deleted:
            return Response({'error': 'Item not found in cart.'}, status=status.HTTP_404_NOT_FOUND)

        logger.info(f'Cart item {cart_item_id} deleted from cart {cart.id}.')
        cart.refresh_from_db()
        return Response(CartSerializer(cart).data)