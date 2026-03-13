# payments/urls.py
from django.urls import path
from .views import InitializePaystackView, InitializeSubscriptionView, PaystackWebhookView

app_name = 'payments'

urlpatterns = [
    path('paystack/initialize/', InitializePaystackView.as_view(), name='paystack-initialize'),
    path('paystack/subscribe/', InitializeSubscriptionView.as_view(), name='paystack-subscribe'),
    path('paystack/webhook/', PaystackWebhookView.as_view(), name='paystack-webhook'),
]