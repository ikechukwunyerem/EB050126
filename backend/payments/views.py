# payments/views.py
import hmac
import hashlib
import json

import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.conf import settings
from orders.models import Order

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

class InitializePaystackView(APIView):
    # Only authenticated users with real orders can pay
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_number = request.data.get('order_number')
        
        if not order_number:
            return Response({'error': 'order_number is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Ensure the order belongs to the user and is still unpaid
            order = Order.objects.get(
                order_number=order_number, 
                user=request.user, 
                payment_status='unpaid'
            )
        except Order.DoesNotExist:
            return Response({'error': 'Valid unpaid order not found'}, status=status.HTTP_404_NOT_FOUND)

        # Paystack API URL
        url = "https://api.paystack.co/transaction/initialize"
        
        # Paystack requires the amount in Kobo (Naira * 100)
        amount_in_kobo = int(order.total_amount * 100)
        
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "email": request.user.email,
            "amount": amount_in_kobo,
            "reference": order.order_number, # We use our order number as the reference
            "callback_url": f"{settings.FRONTEND_URL}/payment-success" # Where Paystack sends the user after paying
        }

        # Make the request to Paystack
        response = requests.post(url, headers=headers, json=data)
        response_data = response.json()

        if response_data.get('status'):
            # Paystack generated a checkout link successfully
            return Response({
                'authorization_url': response_data['data']['authorization_url'],
                'access_code': response_data['data']['access_code'],
                'reference': response_data['data']['reference']
            }, status=status.HTTP_200_OK)
        else:
            # Something went wrong with the Paystack request
            return Response({'error': response_data.get('message', 'Paystack initialization failed')}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(APIView):
    # Public endpoint, no authentication required (we verify the signature instead)
    permission_classes = []

    def post(self, request, *args, **kwargs):
        # 1. Get Paystack's signature from the headers
        paystack_signature = request.headers.get('x-paystack-signature')
        if not paystack_signature:
            return HttpResponse(status=400)

        # 2. Get the raw payload exactly as it arrived
        payload = request.body

        # 3. Calculate our own signature using our Secret Key
        expected_signature = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
            payload,
            hashlib.sha512
        ).hexdigest()

        # 4. Compare the signatures. If they don't match, reject the request!
        if paystack_signature != expected_signature:
            return HttpResponse("Unauthorized", status=401)

        # 5. The request is authentic! Let's process the event.
        try:
            event_data = json.loads(payload)
        except json.JSONDecodeError:
            return HttpResponse(status=400)

        # We only care about successful charges right now
        if event_data.get('event') == 'charge.success':
            data = event_data.get('data', {})
            reference = data.get('reference') # This is our Order Number

            if reference:
                try:
                    # Find the exact order in our database
                    order = Order.objects.get(order_number=reference)
                    
                    # Fulfill the order!
                    if order.payment_status != 'paid':
                        order.payment_status = 'paid'
                        order.save()
                        
                        # --- Future Expansion Point ---
                        # If this was a digital resource, you would create the 
                        # SavedResource access row here. If it was a physical book, 
                        # you might trigger an email to your shipping department here.
                        
                except Order.DoesNotExist:
                    # Log this in a production environment: Paystack sent a success 
                    # message for an order we don't have in our database.
                    pass 

        # 6. Always return a 200 OK immediately so Paystack knows we received it 
        # and doesn't try to send it again.
        return HttpResponse(status=200)