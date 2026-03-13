# products/views.py
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters, permissions

from core.pagination import StandardResultsSetPagination
from .models import Product, ProductCategory
from .serializers import ProductListSerializer, ProductDetailSerializer, ProductCategorySerializer


class ProductCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /product-categories/       — list all categories
    GET /product-categories/{id}/  — category detail
    """
    queryset = ProductCategory.objects.all().order_by('name')
    serializer_class = ProductCategorySerializer
    permission_classes = [permissions.AllowAny]
    # No pagination for categories — full list is always small
    pagination_class = None


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /products/          — paginated, filterable product list
    GET /products/{slug}/   — product detail (digital_file gated by purchase)

    Filters:  ?category=<slug>  ?product_type=physical|digital  ?is_featured=true
    Search:   ?search=<term>    (searches name + description via search_vector)
    Ordering: ?ordering=price|-price,name,-name,created_at
    """
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination
    lookup_field = 'slug'

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'category__slug': ['exact'],
        'product_type':   ['exact'],
        'is_featured':    ['exact'],
        'price':          ['lte', 'gte'],
    }
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'name', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return (
            Product.objects
            .filter(is_active=True)
            .select_related('category')
            .order_by('-created_at')
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def get_serializer_context(self):
        # Pass request into serializer so ProductDetailSerializer
        # can check purchase history for digital_file access
        context = super().get_serializer_context()
        context['request'] = self.request
        return context