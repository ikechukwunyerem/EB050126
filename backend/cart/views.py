# cart/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Cart, CartItem
from products.models import Product
from .serializers import CartSerializer

class CartAPIView(APIView):
    # Allow guests to interact with the cart (we check authentication manually below)
    permission_classes = []

    def get_cart(self, request):
        """Helper method to get the user's cart or the guest's session cart"""
        if request.user.is_authenticated:
            cart, created = Cart.objects.get_or_create(user=request.user)
            return cart
        else:
            # Handle guest carts via Django session keys
            if not request.session.session_key:
                request.session.create()
            cart, created = Cart.objects.get_or_create(
                session_key=request.session.session_key, 
                user=None
            )
            return cart

    def get(self, request):
        """Fetch the current cart"""
        cart = self.get_cart(request)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    def post(self, request):
        """Add a product to the cart or update its quantity"""
        cart = self.get_cart(request)
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        if not product_id:
            return Response({'error': 'product_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if item is already in cart
        cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        
        if not created:
            # If it already exists, just increase the quantity
            cart_item.quantity += quantity
        else:
            cart_item.quantity = quantity
            
        cart_item.save()

        # Return the updated cart
        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)