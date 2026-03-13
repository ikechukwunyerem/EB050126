# subscriptions/apps.py
from django.apps import AppConfig


class SubscriptionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'subscriptions'

    def ready(self):
        # No signals needed — subscription activation is driven by
        # PaystackWebhookView._handle_subscription() in payments/views.py.
        pass