# cart/apps.py
from django.apps import AppConfig


class CartConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cart'

    def ready(self):
        # Cart uses no signals. Guest→user cart merging is handled
        # atomically inside userauth/views.py on login (merge_guest_cart).
        pass