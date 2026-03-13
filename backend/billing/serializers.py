# billing/serializers.py
from rest_framework import serializers
from .models import Invoice, InvoiceItem


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'total_price']


class InvoiceListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the invoice list endpoint.
    No line items — keeps the list response fast.
    """
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'status', 'issue_date', 'due_date',
            'currency', 'total_amount', 'amount_paid', 'balance_due', 'is_overdue',
        ]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """
    Full invoice detail including line items and customer snapshot.
    Used for the detail endpoint and invoice download/print view.
    """
    items = InvoiceItemSerializer(many=True, read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'status', 'issue_date', 'due_date',
            'currency', 'subtotal_amount', 'discount_amount', 'tax_amount',
            'total_amount', 'amount_paid', 'balance_due', 'is_overdue',
            'customer_name', 'customer_email',
            'customer_address_line1', 'customer_address_line2',
            'customer_city', 'customer_state', 'customer_postal_code', 'customer_country',
            'notes', 'terms_and_conditions',
            'items',
            'created_at',
        ]