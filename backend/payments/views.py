# payments/views.py
import hmac
import hashlib
import json
import logging
import uuid
from datetime import timedelta

import requests
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import Cart
from orders.models import Order
from subscriptions.models import SubscriptionPlan, UserSubscription
from billing.services import create_and_save_invoice_from_transaction
from .models import PaymentTransaction, WebhookLog

logger = logging.getLogger(__name__)
User = get_user_model()

PAYSTACK_BASE = 'https://api.paystack.co'


def _paystack_headers():
    return {
        'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}',
        'Content-Type': 'application/json',
    }


# ---------------------------------------------------------------------------
# Initialize — Order Payment
# ---------------------------------------------------------------------------

class InitializePaystackView(APIView):
    """
    POST /payments/initialize/order/

    Creates a pending PaymentTransaction and returns a Paystack
    authorization_url for the frontend to redirect to.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_number = request.data.get('order_number')
        if not order_number:
            return Response(
                {'error': 'order_number is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order = Order.objects.get(
                order_number=order_number,
                user=request.user,
                payment_status='unpaid',
            )
        except Order.DoesNotExist:
            return Response(
                {'error': 'Valid unpaid order not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Issue #19: use a fresh reference per payment attempt, not order_number.
        # This allows retry if the first payment attempt fails.
        reference = f'PAY-{uuid.uuid4().hex[:12].upper()}'

        amount_in_kobo = int(order.total_amount * 100)

        metadata = {
            'transaction_type': 'order',
            'order_id': order.id,
            'order_number': order.order_number,
        }
        if order.shipping_address:
            metadata.update({
                'recipient': order.shipping_address.recipient_name,
                'delivery_city': order.shipping_address.city,
                'delivery_address': order.shipping_address.address_line1,
            })

        data = {
            'email': request.user.email,
            'amount': amount_in_kobo,
            'reference': reference,
            'callback_url': f'{settings.FRONTEND_URL}/payment-success',
            'metadata': metadata,
        }

        try:
            # Issue #7: explicit timeout prevents worker hang on Paystack outage
            response = requests.post(
                f'{PAYSTACK_BASE}/transaction/initialize',
                headers=_paystack_headers(),
                json=data,
                timeout=10,
            )
            response_data = response.json()
        except requests.Timeout:
            logger.error('Paystack initialize timed out for order %s', order.order_number)
            return Response(
                {'error': 'Payment gateway timed out. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.error('Paystack initialize error: %s', e, exc_info=True)
            return Response(
                {'error': 'Could not reach payment gateway.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not response_data.get('status'):
            return Response(
                {'error': response_data.get('message', 'Initialization failed.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Issue #6: create a pending PaymentTransaction so we have a local record
        # before the webhook fires. This is the source of truth for reconciliation.
        PaymentTransaction.objects.create(
            user=request.user,
            amount=order.total_amount,
            currency='NGN',
            status='pending',
            gateway='paystack',
            gateway_reference=reference,
            purpose='order',
            order=order,
        )

        return Response({
            'authorization_url': response_data['data']['authorization_url'],
            'reference': reference,
        })


# ---------------------------------------------------------------------------
# Initialize — Subscription Payment
# ---------------------------------------------------------------------------

class InitializeSubscriptionView(APIView):
    """
    POST /payments/initialize/subscription/

    Creates a pending PaymentTransaction for a subscription plan purchase.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get('plan_id')
        if not plan_id:
            return Response(
                {'error': 'plan_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Issue #15: block if user already has a valid active subscription
        current_sub = (
            UserSubscription.objects
            .filter(user=request.user, is_current=True)
            .first()
        )
        if current_sub and current_sub.is_valid:
            return Response(
                {
                    'error': 'You already have an active subscription.',
                    'expires_at': current_sub.current_period_end,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
            plan_price = plan.prices.get(currency='NGN')
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {'error': 'Valid plan not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception:
            return Response(
                {'error': 'Price not configured for NGN on this plan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reference = f'SUB-{uuid.uuid4().hex[:12].upper()}'
        amount_in_kobo = int(plan_price.amount * 100)

        data = {
            'email': request.user.email,
            'amount': amount_in_kobo,
            'reference': reference,
            'callback_url': f'{settings.FRONTEND_URL}/payment-success',
            'metadata': {
                'transaction_type': 'subscription',
                'plan_id': plan.id,
                'plan_name': plan.name,
            },
        }

        try:
            # Issue #7: explicit timeout
            response = requests.post(
                f'{PAYSTACK_BASE}/transaction/initialize',
                headers=_paystack_headers(),
                json=data,
                timeout=10,
            )
            response_data = response.json()
        except requests.Timeout:
            logger.error('Paystack subscription initialize timed out for plan %s', plan.id)
            return Response(
                {'error': 'Payment gateway timed out. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.error('Paystack subscription initialize error: %s', e, exc_info=True)
            return Response(
                {'error': 'Could not reach payment gateway.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not response_data.get('status'):
            return Response(
                {'error': response_data.get('message', 'Initialization failed.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Issue #6: pending PaymentTransaction before webhook fires
        PaymentTransaction.objects.create(
            user=request.user,
            amount=plan_price.amount,
            currency='NGN',
            status='pending',
            gateway='paystack',
            gateway_reference=reference,
            purpose='subscription',
        )

        return Response({
            'authorization_url': response_data['data']['authorization_url'],
            'reference': reference,
        })


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(APIView):
    """
    POST /payments/webhook/paystack/

    Receives charge.success events from Paystack.
    Always returns 200 quickly — processing is synchronous but guarded.
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        payload = request.body

        # ---------------------------------------------------------------- #
        # 1. Verify HMAC-SHA512 signature                                 #
        # ---------------------------------------------------------------- #
        paystack_signature = request.headers.get('x-paystack-signature', '')
        expected_signature = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
            payload,
            hashlib.sha512,
        ).hexdigest()

        if not hmac.compare_digest(paystack_signature, expected_signature):
            logger.warning('Paystack webhook: invalid signature received.')
            return HttpResponse('Unauthorized', status=401)

        try:
            event_data = json.loads(payload)
        except json.JSONDecodeError:
            return HttpResponse(status=400)

        # ---------------------------------------------------------------- #
        # 2. Log raw payload immediately (Issue #1)                       #
        # Do this before any processing so we never lose an event.        #
        # ---------------------------------------------------------------- #
        webhook_log = WebhookLog.objects.create(
            gateway='paystack',
            payload=payload.decode('utf-8'),
            headers=dict(request.headers),
            status='unprocessed',
        )

        # ---------------------------------------------------------------- #
        # 3. Only handle charge.success events                            #
        # ---------------------------------------------------------------- #
        if event_data.get('event') != 'charge.success':
            webhook_log.status = 'processed'
            webhook_log.processing_notes = f'Ignored event type: {event_data.get("event")}'
            webhook_log.save(update_fields=['status', 'processing_notes'])
            return HttpResponse(status=200)

        data = event_data.get('data', {})
        reference = data.get('reference', '')
        metadata = data.get('metadata', {})
        transaction_type = metadata.get('transaction_type', 'order')

        # ---------------------------------------------------------------- #
        # 4. Idempotency check (Issue #8)                                 #
        # If this reference was already processed, skip silently.         #
        # ---------------------------------------------------------------- #
        already_processed = PaymentTransaction.objects.filter(
            gateway_reference=reference,
            status='successful',
        ).exists()

        if already_processed:
            webhook_log.status = 'processed'
            webhook_log.processing_notes = f'Duplicate event — reference {reference} already processed.'
            webhook_log.save(update_fields=['status', 'processing_notes'])
            logger.info('Webhook: duplicate reference %s ignored.', reference)
            return HttpResponse(status=200)

        # ---------------------------------------------------------------- #
        # 5. Process inside a transaction                                  #
        # ---------------------------------------------------------------- #
        try:
            with transaction.atomic():
                if transaction_type == 'subscription':
                    self._handle_subscription(data, metadata, reference)
                else:
                    self._handle_order(reference)

            # Mark webhook log and PaymentTransaction as successful
            PaymentTransaction.objects.filter(
                gateway_reference=reference
            ).update(
                status='successful',
                gateway_transaction_id=data.get('id', ''),
            )
            webhook_log.status = 'processed'
            webhook_log.processing_notes = 'OK'
            webhook_log.save(update_fields=['status', 'processing_notes'])

        except Exception as e:
            # Issue #21: logger not print
            logger.error(
                'Webhook processing error for reference %s: %s',
                reference, e, exc_info=True,
            )
            webhook_log.status = 'error'
            webhook_log.processing_notes = str(e)
            webhook_log.save(update_fields=['status', 'processing_notes'])
            # Still return 200 — Paystack will retry on non-200, causing duplicate processing
            return HttpResponse(status=200)

        return HttpResponse(status=200)

    # ------------------------------------------------------------------ #
    # Private handlers
    # ------------------------------------------------------------------ #

    def _handle_order(self, reference):
        """Mark order as paid and clear the cart. (Issue #18: cart cleared here)"""
        try:
            order = Order.objects.select_related('user').get(order_number__contains=reference)
        except Order.DoesNotExist:
            # Fall back: look up via PaymentTransaction
            tx = PaymentTransaction.objects.select_related('order__user').get(
                gateway_reference=reference
            )
            order = tx.order

        if order.payment_status == 'paid':
            return  # already handled

        order.payment_status = 'paid'
        order.status = 'processing'
        order.save(update_fields=['payment_status', 'status'])

        # Issue #18: clear cart only after confirmed payment
        Cart.objects.filter(user=order.user).delete()

        logger.info('Order %s marked as paid. Cart cleared.', order.order_number)

        # Generate and persist invoice for this order payment
        tx = PaymentTransaction.objects.filter(
            gateway_reference=reference, purpose='order'
        ).first()
        if tx:
            transaction.on_commit(
                lambda: create_and_save_invoice_from_transaction(tx.pk)
            )

    def _handle_subscription(self, data, metadata, reference):
        """
        Activate or renew the user's subscription.
        Issue #2: correctly manages is_current flag to avoid UniqueConstraint violation.
        """
        user_email = data.get('customer', {}).get('email', '')
        plan_id = metadata.get('plan_id')

        user = User.objects.get(email=user_email)
        plan = SubscriptionPlan.objects.get(id=plan_id)
        end_date = timezone.now() + timedelta(days=plan.duration_days)

        # Mark any existing current subscription as no longer current
        UserSubscription.objects.filter(
            user=user, is_current=True
        ).update(is_current=False)

        # Create the new subscription record as the current one
        new_sub = UserSubscription.objects.create(
            user=user,
            plan=plan,
            status='active',
            current_period_start=timezone.now(),
            current_period_end=end_date,
            is_current=True,
            cancel_at_period_end=False,
        )

        # Link the PaymentTransaction to the new subscription
        PaymentTransaction.objects.filter(
            gateway_reference=reference
        ).update(subscription=new_sub)

        logger.info(
            'Subscription activated for %s — plan: %s, expires: %s',
            user.email, plan.name, end_date,
        )

        # Generate and persist invoice for this subscription payment
        tx = PaymentTransaction.objects.filter(
            gateway_reference=reference, purpose='subscription'
        ).first()
        if tx:
            transaction.on_commit(
                lambda: create_and_save_invoice_from_transaction(tx.pk)
            )