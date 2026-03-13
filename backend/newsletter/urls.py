# newsletter/urls.py
from django.urls import path
from .views import SubscribeView, UnsubscribeView, MySubscriptionView

app_name = 'newsletter'

urlpatterns = [
    path('subscribe/', SubscribeView.as_view(), name='subscribe'),
    path('unsubscribe/', UnsubscribeView.as_view(), name='unsubscribe'),
    path('me/', MySubscriptionView.as_view(), name='my-subscription'),
]