# billing/apps.py
from django.apps import AppConfig


class BillingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'billing'

    def ready(self):
        # No signals needed — invoice creation is triggered directly
        # by the payments webhook handler via create_and_save_invoice_from_transaction().
        pass