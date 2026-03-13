# billing/urls.py
from django.urls import path
from .views import InvoiceListView, InvoiceDetailView, InvoiceHTMLView

app_name = 'billing'

urlpatterns = [
    path('invoices/', InvoiceListView.as_view(), name='invoice-list'),
    path('invoices/<str:invoice_number>/', InvoiceDetailView.as_view(), name='invoice-detail'),
    path('invoices/<str:invoice_number>/html/', InvoiceHTMLView.as_view(), name='invoice-html'),
]