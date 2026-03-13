# orders/admin.py
from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'price', 'quantity', 'subtotal')
    can_delete = False

    def subtotal(self, obj):
        return obj.subtotal
    subtotal.short_description = 'Subtotal'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_number', 'user', 'status', 'payment_status',
        'total_amount', 'created_at',
    )
    list_filter = ('status', 'payment_status', 'created_at')
    search_fields = ('order_number', 'user__email')
    readonly_fields = ('order_number', 'total_amount', 'created_at', 'updated_at')
    raw_id_fields = ('user', 'shipping_address')
    inlines = [OrderItemInline]

    fieldsets = (
        ('Order Info', {
            'fields': ('order_number', 'user', 'shipping_address'),
        }),
        ('Status', {
            'fields': ('status', 'payment_status', 'total_amount'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )