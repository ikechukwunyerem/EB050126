# payments/views.py
import requests
import hmac
import hashlib
import json
import uuid
from datetime import timedelta

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from orders.models import Order
from subscriptions.models import SubscriptionPlan, UserSubscription

User = get_user_model()

class InitializePaystackView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_number = request.data.get('order_number')
        
        try:
            order = Order.objects.get(
                order_number=order_number, 
                user=request.user, 
                payment_status='unpaid'
            )
        except Order.DoesNotExist:
            return Response({'error': 'Valid unpaid order not found'}, status=status.HTTP_404_NOT_FOUND)

        url = "https://api.paystack.co/transaction/initialize"
        amount_in_kobo = int(order.total_amount * 100)
        
        # Prepare rich metadata for the Paystack Dashboard
        metadata = {
            "transaction_type": "order",
            "order_id": order.id,
        }
        
        if order.shipping_address:
            metadata.update({
                "recipient": order.shipping_address.recipient_name,
                "delivery_city": order.shipping_address.city,
                "delivery_address": order.shipping_address.address_line1
            })

        data = {
            "email": request.user.email,
            "amount": amount_in_kobo,
            "reference": order.order_number,
            "callback_url": f"{settings.FRONTEND_URL}/payment-success",
            "metadata": metadata
        }

        response = requests.post(url, headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}, json=data)
        return Response(response.json())


class InitializeSubscriptionView(APIView):
    """Initializes recurring subscription plans"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get('plan_id')
        
        if not plan_id:
            return Response({'error': 'plan_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
            plan_price = plan.prices.get(currency='NGN')
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Valid plan not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({'error': 'Price not configured for this plan'}, status=status.HTTP_400_BAD_REQUEST)

        reference = f"SUB-{uuid.uuid4().hex[:8].upper()}"
        amount_in_kobo = int(plan_price.amount * 100)
        
        url = "https://api.paystack.co/transaction/initialize"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "email": request.user.email,
            "amount": amount_in_kobo,
            "reference": reference,
            "callback_url": f"{settings.FRONTEND_URL}/payment-success",
            "metadata": {
                "transaction_type": "subscription",
                "plan_id": plan.id
            }
        }

        response = requests.post(url, headers=headers, json=data)
        response_data = response.json()

        if response_data.get('status'):
            return Response({
                'authorization_url': response_data['data']['authorization_url'],
                'reference': reference
            }, status=status.HTTP_200_OK)
        else:
            return Response({'error': response_data.get('message', 'Initialization failed')}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(APIView):
    """Securely handles successful payments from Paystack"""
    permission_classes = []

    def post(self, request, *args, **kwargs):
        paystack_signature = request.headers.get('x-paystack-signature')
        if not paystack_signature:
            return HttpResponse(status=400)

        payload = request.body

        expected_signature = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
            payload,
            hashlib.sha512
        ).hexdigest()

        if paystack_signature != expected_signature:
            return HttpResponse("Unauthorized", status=401)

        try:
            event_data = json.loads(payload)
        except json.JSONDecodeError:
            return HttpResponse(status=400)

        if event_data.get('event') == 'charge.success':
            data = event_data.get('data', {})
            reference = data.get('reference', '')
            metadata = data.get('metadata', {})
            
            # Read our secret tag to know how to process this
            transaction_type = metadata.get('transaction_type', 'order')

            if transaction_type == 'subscription':
                plan_id = metadata.get('plan_id')
                user_email = data.get('customer', {}).get('email')
                
                try:
                    user = User.objects.get(email=user_email)
                    plan = SubscriptionPlan.objects.get(id=plan_id)
                    
                    end_date = timezone.now() + timedelta(days=plan.duration_days)
                    
                    UserSubscription.objects.update_or_create(
                        user=user,
                        defaults={
                            'plan': plan,
                            'status': 'active',
                            'current_period_start': timezone.now(),
                            'current_period_end': end_date,
                            'cancel_at_period_end': False
                        }
                    )
                except Exception as e:
                    print("Webhook Subscription Error:", e)

            else:
                if reference.startswith('ORD-'):
                    try:
                        order = Order.objects.get(order_number=reference)
                        if order.payment_status != 'paid':
                            order.payment_status = 'paid'
                            order.save()
                    except Order.DoesNotExist:
                        pass

        return HttpResponse(status=200)