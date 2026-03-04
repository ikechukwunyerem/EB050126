# products/serializers.py
from rest_framework import serializers
from .models import Product, ProductCategory

class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug']

class ProductSerializer(serializers.ModelSerializer):
    # We nest the category so React gets the name, not just an ID number
    category = ProductCategorySerializer(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'category', 
            'product_type', 'price', 'stock', 'is_active', 
            'cover_image', 'thumbnail', 'created_at'
        ]