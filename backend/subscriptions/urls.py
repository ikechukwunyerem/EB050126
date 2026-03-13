# subscriptions/urls.py
from django.urls import path
from .views import SubscriptionPlanListView, UserSubscriptionStatusView, UserSubscriptionHistoryView

app_name = 'subscriptions'

urlpatterns = [
    path('plans/', SubscriptionPlanListView.as_view(), name='plan-list'),
    path('my-status/', UserSubscriptionStatusView.as_view(), name='my-status'),
    path('history/', UserSubscriptionHistoryView.as_view(), name='history'),
]