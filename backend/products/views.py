# products/views.py
from rest_framework import viewsets, permissions
from .models import Product, ProductCategory
from .serializers import ProductSerializer, ProductCategorySerializer

class ProductCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [permissions.AllowAny]

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        # Strictly return only active products to the frontend
        return Product.objects.filter(is_active=True).order_by('-created_at')