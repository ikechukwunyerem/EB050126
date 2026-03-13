# billing/models.py
import uuid
from decimal import Decimal
from django.db import models, transaction
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


INVOICE_STATUS_CHOICES = [
    ('draft',               _('Draft')),
    ('issued',              _('Issued')),
    ('paid',                _('Paid')),
    ('partially_paid',      _('Partially Paid')),
    ('overdue',             _('Overdue')),
    ('cancelled',           _('Cancelled')),
    ('refunded',            _('Refunded')),
    ('partially_refunded',  _('Partially Refunded')),
]


class Invoice(models.Model):
    """
    Persistent invoice record generated after every successful payment.
    Covers both product orders and subscription payments.

    Customer details are snapshotted at creation time so the invoice
    remains accurate even if the user later changes their address.

    Financial fields (subtotal, total) are maintained by recalculate_totals()
    after InvoiceItems are created — never set manually.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        editable=False,
        verbose_name=_('Invoice Number'),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
        verbose_name=_('Customer'),
    )
    payment_transaction = models.OneToOneField(
        'payments.PaymentTransaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_record',
        verbose_name=_('Payment Transaction'),
    )

    # --- Customer snapshot (frozen at invoice creation time) ---
    customer_name = models.CharField(max_length=255, blank=True)
    customer_email = models.EmailField(blank=True)
    customer_address_line1 = models.CharField(max_length=255, blank=True)
    customer_address_line2 = models.CharField(max_length=255, blank=True)
    customer_city = models.CharField(max_length=100, blank=True)
    customer_state = models.CharField(max_length=100, blank=True)
    customer_postal_code = models.CharField(max_length=20, blank=True)
    customer_country = models.CharField(max_length=100, blank=True)

    # --- Invoice metadata ---
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=INVOICE_STATUS_CHOICES,
        default='draft',
        db_index=True,
    )
    currency = models.CharField(max_length=3, default='NGN')

    # --- Financials (maintained by recalculate_totals) ---
    subtotal_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    notes = models.TextField(blank=True)
    terms_and_conditions = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Invoice')
        verbose_name_plural = _('Invoices')
        ordering = ['-issue_date', '-invoice_number']

    def __str__(self):
        return f'Invoice {self.invoice_number} — {self.customer_email or self.user}'

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = self._generate_invoice_number()
        if not self.terms_and_conditions:
            self.terms_and_conditions = getattr(settings, 'INVOICE_TERMS_AND_CONDITIONS', '')
        super().save(*args, **kwargs)

    def _generate_invoice_number(self):
        """
        Generates a date-prefixed sequential invoice number: INV-YYYYMMDD-0001.
        Uses select_for_update() inside an atomic block to prevent race conditions
        under concurrent requests.
        """
        prefix = f'INV-{timezone.now().strftime("%Y%m%d")}-'
        with transaction.atomic():
            last = (
                Invoice.objects
                .select_for_update()
                .filter(invoice_number__startswith=prefix)
                .order_by('invoice_number')
                .last()
            )
            if last:
                try:
                    next_num = int(last.invoice_number.split('-')[-1]) + 1
                except (IndexError, ValueError):
                    next_num = 1
            else:
                next_num = 1
        return f'{prefix}{next_num:04d}'

    @property
    def balance_due(self):
        return self.total_amount - self.amount_paid

    @property
    def is_overdue(self):
        if self.status not in ('paid', 'cancelled', 'refunded') and self.due_date:
            return timezone.now().date() > self.due_date
        return False

    def recalculate_totals(self):
        """
        Recomputes subtotal and total from all InvoiceItems.
        Called once after all items have been created — not inside InvoiceItem.save().
        """
        subtotal = sum(item.total_price for item in self.items.all())
        self.subtotal_amount = subtotal
        self.total_amount = subtotal - self.discount_amount + self.tax_amount
        self.save(update_fields=['subtotal_amount', 'total_amount'])


class InvoiceItem(models.Model):
    """
    A single line item on an invoice.
    product FK is nullable — subscription invoices have no catalogue product.
    total_price is computed from quantity × unit_price in save().
    recalculate_totals() is NOT called here — the service calls it once after
    all items are created to avoid N+1 writes.
    """
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    # Snapshot of name/description at time of invoicing
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.00'))
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    class Meta:
        verbose_name = _('Invoice Item')
        verbose_name_plural = _('Invoice Items')
        ordering = ['id']

    def __str__(self):
        return f'{self.description} × {self.quantity} on {self.invoice.invoice_number}'

    def save(self, *args, **kwargs):
        # Compute total_price; do NOT call invoice.recalculate_totals() here
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)