# orders/apps.py
from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'orders'

    def ready(self):
        # No signals needed — order status transitions are driven by
        # the Paystack webhook handler in payments/views.py.
        pass