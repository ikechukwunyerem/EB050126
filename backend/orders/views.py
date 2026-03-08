# orders/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import transaction
import uuid

from .models import Order, OrderItem
from cart.models import Cart
from userauth.models import Address
from .serializers import OrderSerializer

class CheckoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated] 

    @transaction.atomic
    def post(self, request):
        # Extract the chosen address from the request
        address_id = request.data.get('address_id')
        
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({'error': 'No active cart found'}, status=status.HTTP_404_NOT_FOUND)

        if cart.items.count() == 0:
            return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate the address belongs to the user
        address = None
        if address_id:
            address = Address.objects.filter(id=address_id, user=request.user).first()
            if not address:
                return Response({'error': 'Invalid address selection'}, status=status.HTTP_400_BAD_REQUEST)

        total_amount = cart.grand_total

        # Create Order with the new shipping_address relation
        order = Order.objects.create(
            user=request.user,
            shipping_address=address,
            order_number=f"ORD-{uuid.uuid4().hex[:8].upper()}",
            total_amount=total_amount,
            status='pending',
            payment_status='unpaid'
        )

        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                price=cart_item.product.price, 
                quantity=cart_item.quantity
            )

        cart.items.all().delete()

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)