# payments/serializers.py
from rest_framework import serializers
from .models import PaymentTransaction, WebhookLog


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for exposing transaction records to authenticated users.
    Used by the order detail and invoice views to show payment confirmation.
    Sensitive gateway internals (raw webhook payload) are never exposed here.
    """
    purpose_display = serializers.CharField(source='get_purpose_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'amount', 'currency', 'status', 'status_display',
            'gateway', 'gateway_reference', 'purpose', 'purpose_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class WebhookLogSerializer(serializers.ModelSerializer):
    """Admin-only serializer — never exposed to end users directly."""
    class Meta:
        model = WebhookLog
        fields = ['id', 'gateway', 'status', 'processing_notes', 'received_at']
        read_only_fields = fields