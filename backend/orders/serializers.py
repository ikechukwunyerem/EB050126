# orders/serializers.py
from rest_framework import serializers
from .models import Order, OrderItem
from userauth.models import Address


class ShippingAddressSerializer(serializers.ModelSerializer):
    """Inline snapshot of the address used for this order."""
    class Meta:
        model = Address
        fields = [
            'id', 'recipient_name', 'address_line1', 'address_line2',
            'city', 'state_province_county', 'postal_code', 'country',
            'phone_number',
        ]


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    # Expose product_type so frontend knows if fulfilment is digital or physical
    product_type = serializers.ReadOnlyField(source='product.product_type')
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_type', 'price', 'quantity', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    # Issue #22: shipping_address included so frontend knows delivery destination
    shipping_address = ShippingAddressSerializer(read_only=True)
    # Issue #14: user is read-only — never accept user from request body
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    is_paid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'order_number', 'status', 'payment_status', 'is_paid',
            'total_amount', 'shipping_address', 'created_at', 'items',
        ]
        read_only_fields = [
            'id', 'user', 'order_number', 'total_amount',
            'payment_status', 'is_paid', 'created_at',
        ]