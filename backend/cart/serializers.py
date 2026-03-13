# cart/serializers.py
from rest_framework import serializers
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_price = serializers.ReadOnlyField(source='product.price')
    product_type = serializers.ReadOnlyField(source='product.product_type')
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_name', 'product_price',
            'product_type', 'quantity', 'subtotal',
        ]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.ReadOnlyField()
    grand_total = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        # Issue #13: user and session_key removed — both are internal identifiers
        # that have no value to the frontend and session_key is security-sensitive.
        fields = ['id', 'items', 'total_items', 'grand_total']