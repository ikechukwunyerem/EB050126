# orders/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import transaction
import uuid

from .models import Order, OrderItem
from cart.models import Cart
from .serializers import OrderSerializer

class CheckoutAPIView(APIView):
    # Strictly require users to be logged in to checkout
    permission_classes = [permissions.IsAuthenticated] 

    @transaction.atomic
    def post(self, request):
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({'error': 'No active cart found'}, status=status.HTTP_404_NOT_FOUND)

        if cart.items.count() == 0:
            return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Calculate the final total explicitly to avoid cart manipulation
        total_amount = sum(item.product.price * item.quantity for item in cart.items.all())

        # 2. Create the Order securely
        order = Order.objects.create(
            user=request.user,
            order_number=f"ORD-{uuid.uuid4().hex[:8].upper()}",
            total_amount=total_amount,
            status='pending',
            payment_status='unpaid'
        )

        # 3. Move items from Cart to Order (locking in the historical price)
        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                price=cart_item.product.price, 
                quantity=cart_item.quantity
            )

        # 4. Empty the Cart
        cart.items.all().delete()

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)