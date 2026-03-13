# payments/apps.py
from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payments'

    def ready(self):
        # No signals needed — all payment state transitions happen inside
        # PaystackWebhookView in payments/views.py.
        pass