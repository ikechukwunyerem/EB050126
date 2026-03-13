# billing/services.py
import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from payments.models import PaymentTransaction
from .models import Invoice, InvoiceItem

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_address_snapshot(address) -> dict:
    """Converts a userauth.Address instance to an invoice snapshot dict."""
    if not address:
        return {}
    return {
        'customer_name':        address.recipient_name or '',
        'customer_address_line1': address.address_line1 or '',
        'customer_address_line2': address.address_line2 or '',
        'customer_city':        address.city or '',
        'customer_state':       address.state_province_county or '',
        'customer_postal_code': address.postal_code or '',
        'customer_country':     address.country or '',
    }


def _company_context() -> dict:
    """Pulls company/branding settings for use in the invoice template."""
    return {
        'company_name':         getattr(settings, 'INVOICE_COMPANY_NAME', getattr(settings, 'APP_DISPLAY_NAME', 'Efiko')),
        'company_address_line1': getattr(settings, 'INVOICE_COMPANY_ADDRESS_LINE1', ''),
        'company_address_line2': getattr(settings, 'INVOICE_COMPANY_ADDRESS_LINE2', ''),
        'company_phone':        getattr(settings, 'INVOICE_COMPANY_PHONE', ''),
        'company_email':        getattr(settings, 'INVOICE_COMPANY_EMAIL', getattr(settings, 'SUPPORT_EMAIL', '')),
        'company_website':      getattr(settings, 'INVOICE_COMPANY_WEBSITE', getattr(settings, 'FRONTEND_URL', '')),
        'company_logo_url':     getattr(settings, 'INVOICE_COMPANY_LOGO_URL', None),
    }


# ---------------------------------------------------------------------------
# Step 1 — Build invoice data dict (pure, no DB writes)
# ---------------------------------------------------------------------------

def generate_invoice_data_for_transaction(payment_transaction_id: int) -> dict | None:
    """
    Builds a structured dict describing the invoice for a given PaymentTransaction.
    No database writes — safe to call in tests or for preview rendering.

    Field names align with our actual schema:
    - PaymentTransaction: purpose / gateway_reference / gateway_transaction_id
    - Order: items with price + quantity, shipping_address (no billing_address in our schema)
    - UserSubscription: plan FK → SubscriptionPlan; period from current_period_start/end
    - No promo_code, payment_method, or expected_amount (not in our PaymentTransaction)
    """
    try:
        tx = PaymentTransaction.objects.select_related(
            'user',
            'order__shipping_address',
            'order__items__product',
            'subscription__plan',
        ).get(pk=payment_transaction_id)
    except PaymentTransaction.DoesNotExist:
        logger.error('generate_invoice_data: PaymentTransaction %d not found.', payment_transaction_id)
        return None

    today = timezone.now().date()

    data = {
        # Resolved later when Invoice is created
        'invoice_number': None,
        'issue_date': today,
        'due_date': today,
        'currency': tx.currency,
        'status': 'paid' if tx.status == 'successful' else 'draft',
        'transaction_reference': tx.gateway_reference,
        'gateway_transaction_id': tx.gateway_transaction_id or '',

        **_company_context(),

        # Customer snapshot — defaults, overridden below
        'customer_name': '',
        'customer_email': '',
        'customer_address_line1': '',
        'customer_address_line2': '',
        'customer_city': '',
        'customer_state': '',
        'customer_postal_code': '',
        'customer_country': '',

        'line_items_data': [],

        # Financial accumulators
        'subtotal_amount_calc': Decimal('0.00'),
        'discount_amount_calc': Decimal('0.00'),
        'tax_amount_calc':      Decimal('0.00'),
        'total_amount_calc':    tx.amount,
        'amount_paid_calc':     tx.amount if tx.status == 'successful' else Decimal('0.00'),

        'notes': '',
        'terms_and_conditions': getattr(settings, 'INVOICE_TERMS_AND_CONDITIONS', ''),
        'footer_note':          getattr(settings, 'INVOICE_FOOTER_NOTE', ''),

        # References for create_and_save_invoice_from_transaction
        '_tx_id':   tx.pk,
        '_user_obj': tx.user,
    }

    # --- Populate customer details from user + address ---
    if tx.user:
        user = tx.user
        data['customer_name']  = getattr(user, 'full_name', '') or user.email.split('@')[0]
        data['customer_email'] = user.email

        # Pull default billing address if it exists
        try:
            from userauth.models import Address
            default_billing = Address.objects.filter(
                user=user, is_default_billing=True
            ).first()
            if default_billing:
                data.update(_get_address_snapshot(default_billing))
        except Exception:
            pass  # Address model unavailable — degrade gracefully

    # --- Line items and address override per payment type ---
    if tx.purpose == 'order' and tx.order:
        order = tx.order
        data['invoice_title'] = f'Invoice for Order #{order.order_number}'
        data['due_date'] = order.created_at.date()

        # Use the order's shipping address (we have no billing_address field)
        if order.shipping_address:
            data.update(_get_address_snapshot(order.shipping_address))

        subtotal = Decimal('0.00')
        for item in order.items.all():
            # Our OrderItem uses `price` not `price_at_purchase`
            line_total = item.price * item.quantity
            data['line_items_data'].append({
                'product':     item.product,
                'description': item.product.name if item.product else 'Product',
                'quantity':    Decimal(str(item.quantity)),
                'unit_price':  item.price,
            })
            subtotal += line_total

        data['subtotal_amount_calc'] = subtotal

    elif tx.purpose == 'subscription' and tx.subscription:
        sub = tx.subscription
        plan = sub.plan  # FK to SubscriptionPlan

        # Fetch the NGN price for the plan
        try:
            plan_price = plan.prices.get(currency=tx.currency)
        except Exception:
            plan_price = plan.prices.filter(currency=tx.currency).first()

        if plan_price:
            description = f'{plan.name} — {tx.currency} {plan_price.amount}'
            if sub.current_period_start and sub.current_period_end:
                fmt = '%b %d, %Y'
                description += (
                    f' (Period: {sub.current_period_start.strftime(fmt)}'
                    f' – {sub.current_period_end.strftime(fmt)})'
                )
            data['invoice_title'] = f'Invoice for {plan.name} Subscription'
        else:
            description = f'{plan.name} Subscription'
            data['invoice_title'] = f'Invoice for {plan.name} Subscription'
            plan_price = None

        data['line_items_data'].append({
            'product':     None,
            'description': description,
            'quantity':    Decimal('1.00'),
            'unit_price':  plan_price.amount if plan_price else tx.amount,
        })
        data['subtotal_amount_calc'] = plan_price.amount if plan_price else tx.amount

    # Final total reconciliation
    data['total_amount_calc'] = (
        data['subtotal_amount_calc']
        - data['discount_amount_calc']
        + data['tax_amount_calc']
    )
    data['balance_due_calc'] = data['total_amount_calc'] - data['amount_paid_calc']

    return data


# ---------------------------------------------------------------------------
# Step 2 — Persist Invoice + InvoiceItems (DB writes, atomic)
# ---------------------------------------------------------------------------

@transaction.atomic
def create_and_save_invoice_from_transaction(payment_transaction_id: int) -> Invoice | None:
    """
    Generates invoice data and persists an Invoice + InvoiceItem records.
    Idempotent — returns the existing invoice if one already exists for this transaction.
    Called from payments webhook handler after a successful payment is confirmed.
    """
    # Idempotency check
    existing = Invoice.objects.filter(
        payment_transaction_id=payment_transaction_id
    ).first()
    if existing:
        logger.info(
            'Invoice %s already exists for transaction %d — skipping.',
            existing.invoice_number, payment_transaction_id,
        )
        return existing

    data = generate_invoice_data_for_transaction(payment_transaction_id)
    if not data:
        return None

    try:
        invoice = Invoice.objects.create(
            user=data['_user_obj'],
            payment_transaction_id=data['_tx_id'],
            customer_name=data['customer_name'],
            customer_email=data['customer_email'],
            customer_address_line1=data['customer_address_line1'],
            customer_address_line2=data['customer_address_line2'],
            customer_city=data['customer_city'],
            customer_state=data['customer_state'],
            customer_postal_code=data['customer_postal_code'],
            customer_country=data['customer_country'],
            issue_date=data['issue_date'],
            due_date=data['due_date'],
            status=data['status'],
            currency=data['currency'],
            subtotal_amount=data['subtotal_amount_calc'],
            discount_amount=data['discount_amount_calc'],
            tax_amount=data['tax_amount_calc'],
            total_amount=data['total_amount_calc'],
            amount_paid=data['amount_paid_calc'],
            notes=data['notes'],
            terms_and_conditions=data['terms_and_conditions'],
        )

        # Create all items — InvoiceItem.save() computes total_price only
        for item_data in data['line_items_data']:
            InvoiceItem.objects.create(
                invoice=invoice,
                product=item_data.get('product'),
                description=item_data['description'],
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price'],
            )

        # Single recalculate after all items exist — avoids N+1 writes
        invoice.recalculate_totals()

        logger.info(
            'Invoice %s created for PaymentTransaction %d.',
            invoice.invoice_number, payment_transaction_id,
        )
        return invoice

    except Exception:
        logger.exception(
            'Failed to create invoice for PaymentTransaction %d.', payment_transaction_id
        )
        return None


# ---------------------------------------------------------------------------
# Step 3 — Render to HTML (for email attachment or PDF generation)
# ---------------------------------------------------------------------------

def render_invoice_html(invoice_data: dict) -> str | None:
    """
    Renders the invoice data dict to an HTML string using the invoice template.
    The template lives at: billing/templates/billing/invoice.html

    PDF generation (e.g. via WeasyPrint) can be added here in the future:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html).write_pdf()
    """
    if not invoice_data:
        return None
    try:
        return render_to_string('billing/invoice.html', {'invoice': invoice_data})
    except Exception:
        logger.exception('render_invoice_html failed.')
        return None