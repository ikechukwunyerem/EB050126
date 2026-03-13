# payments/admin.py
from django.contrib import admin
from .models import PaymentTransaction, WebhookLog


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'gateway_reference', 'user', 'amount', 'currency',
        'status', 'purpose', 'gateway', 'created_at',
    )
    list_filter = ('status', 'purpose', 'gateway', 'currency', 'created_at')
    search_fields = ('gateway_reference', 'user__email', 'gateway_transaction_id')
    readonly_fields = (
        'gateway_reference', 'gateway_transaction_id',
        'amount', 'currency', 'gateway', 'purpose',
        'order', 'subscription', 'user', 'created_at', 'updated_at',
    )
    raw_id_fields = ('user', 'order', 'subscription')

    fieldsets = (
        ('Transaction', {
            'fields': (
                'gateway_reference', 'gateway_transaction_id',
                'gateway', 'amount', 'currency', 'status',
            ),
        }),
        ('Linked To', {
            'fields': ('purpose', 'order', 'subscription', 'user'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def has_add_permission(self, request):
        # Transactions are system-generated — prevent manual creation
        return False


@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    list_display = ('gateway', 'status', 'received_at')
    list_filter = ('gateway', 'status', 'received_at')
    search_fields = ('payload',)
    readonly_fields = ('gateway', 'payload', 'headers', 'received_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        # Logs are immutable — only status and notes can be changed by the system
        return False