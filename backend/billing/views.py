# billing/views.py
import logging
from django.http import HttpResponse
from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from core.pagination import StandardResultsSetPagination
from .models import Invoice
from .serializers import InvoiceListSerializer, InvoiceDetailSerializer
from .services import render_invoice_html

logger = logging.getLogger(__name__)


class InvoiceListView(generics.ListAPIView):
    """
    GET /billing/invoices/

    Returns a paginated list of the authenticated user's invoices,
    most recent first. No line items — lightweight for list display.
    """
    serializer_class = InvoiceListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return (
            Invoice.objects
            .filter(user=self.request.user)
            .order_by('-issue_date', '-invoice_number')
        )


class InvoiceDetailView(generics.RetrieveAPIView):
    """
    GET /billing/invoices/{invoice_number}/

    Returns the full invoice with line items.
    Scoped to the requesting user — users cannot view other people's invoices.
    """
    serializer_class = InvoiceDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'invoice_number'

    def get_queryset(self):
        return Invoice.objects.filter(user=self.request.user).prefetch_related('items')


class InvoiceHTMLView(APIView):
    """
    GET /billing/invoices/{invoice_number}/html/

    Returns the invoice rendered as an HTML page, suitable for printing
    or generating a PDF client-side via window.print().

    This endpoint returns text/html directly rather than JSON.
    The frontend can open it in a new tab for the user to print or save as PDF.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, invoice_number):
        try:
            invoice = (
                Invoice.objects
                .prefetch_related('items__product')
                .get(invoice_number=invoice_number, user=request.user)
            )
        except Invoice.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Build the data dict that the template expects
        from .serializers import InvoiceDetailSerializer
        invoice_data = InvoiceDetailSerializer(invoice).data
        # Add company context for the template header
        from .services import _company_context
        invoice_data = dict(invoice_data)
        invoice_data.update(_company_context())

        html = render_invoice_html(invoice_data)
        if not html:
            return Response(
                {'detail': 'Invoice template could not be rendered.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return HttpResponse(html, content_type='text/html')