# orders/urls.py
from django.urls import path
from .views import CheckoutAPIView, OrderListView, OrderDetailView

app_name = 'orders'

urlpatterns = [
    path('checkout/', CheckoutAPIView.as_view(), name='checkout'),
    path('', OrderListView.as_view(), name='order-list'),
    path('<str:order_number>/', OrderDetailView.as_view(), name='order-detail'),
]