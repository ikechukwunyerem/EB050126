# billing/admin.py
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Invoice, InvoiceItem


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    fields = ('product', 'description', 'quantity', 'unit_price', 'total_price')
    # total_price is computed in InvoiceItem.save() — never editable
    readonly_fields = ('total_price',)
    extra = 0
    raw_id_fields = ('product',)

    def has_delete_permission(self, request, obj=None):
        # Prevent deleting line items from paid invoices — would break financial records
        if obj and obj.status == 'paid':
            return False
        return True


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        'invoice_number', 'customer_display', 'status',
        'issue_date', 'total_amount', 'currency', 'amount_paid', 'balance_due',
    )
    list_filter = ('status', 'currency', 'issue_date')
    search_fields = ('invoice_number', 'customer_email', 'user__email', 'payment_transaction__gateway_reference')
    date_hierarchy = 'issue_date'
    raw_id_fields = ('user', 'payment_transaction')
    inlines = [InvoiceItemInline]

    readonly_fields = (
        'id', 'invoice_number', 'balance_due',
        # Financials are owned by recalculate_totals() — not manually editable
        'subtotal_amount', 'total_amount',
        'created_at', 'updated_at',
    )

    fieldsets = (
        (None, {
            'fields': ('invoice_number', 'status', 'user', 'payment_transaction'),
        }),
        (_('Customer Snapshot'), {
            'classes': ('collapse',),
            'fields': (
                'customer_name', 'customer_email',
                'customer_address_line1', 'customer_address_line2',
                'customer_city', 'customer_state',
                'customer_postal_code', 'customer_country',
            ),
        }),
        (_('Dates'), {
            'fields': ('issue_date', 'due_date'),
        }),
        (_('Financials'), {
            'description': _('subtotal and total are calculated from line items. Adjust discount or tax and save to recalculate.'),
            'fields': ('currency', 'subtotal_amount', 'discount_amount', 'tax_amount', 'total_amount', 'amount_paid', 'balance_due'),
        }),
        (_('Notes & Terms'), {
            'fields': ('notes', 'terms_and_conditions'),
        }),
        (_('Metadata'), {
            'classes': ('collapse',),
            'fields': ('id', 'created_at', 'updated_at'),
        }),
    )

    def customer_display(self, obj):
        return obj.customer_email or (obj.user.email if obj.user else '—')
    customer_display.short_description = _('Customer')
    customer_display.admin_order_field = 'customer_email'

    def save_model(self, request, obj, form, change):
        """
        After saving the invoice header (e.g. discount/tax change),
        recalculate totals so they stay consistent with the line items.
        """
        super().save_model(request, obj, form, change)
        if change:
            obj.recalculate_totals()