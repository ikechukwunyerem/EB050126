# resources/serializers.py
from rest_framework import serializers
from .models import Resource, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description']

class ResourceSerializer(serializers.ModelSerializer):
    # Nested serializer to return the full category object, not just the ID
    category = CategorySerializer(read_only=True)
    
    class Meta:
        model = Resource
        fields = [
            'id', 'title', 'slug', 'description', 'category', 
            'resource_type', 'access_level', 'status', 
            'file', 'cover_image', 'thumbnail', 'created_at'
        ]