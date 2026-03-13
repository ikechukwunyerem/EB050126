# core/pagination.py
from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    Default pagination used across all apps.
    Import from here rather than from any specific app.
    """
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100