# cart/urls.py
# Cart routes are registered directly in endpoints/urls.py as bare paths
# rather than via include() because the cart is a single-resource API
# (one endpoint handles GET/POST/PATCH/DELETE).
#
# Current registration in endpoints/urls.py:
#   path('cart/', CartAPIView.as_view(), name='cart_api'),
#
# This file is kept as a placeholder for future expansion
# (e.g. cart item count badge endpoint, cart expiry endpoint).
from django.urls import path
from .views import CartAPIView

app_name = 'cart'

urlpatterns = [
    path('', CartAPIView.as_view(), name='cart'),
]