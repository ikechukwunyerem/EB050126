# blog/serializers.py
from rest_framework import serializers
from .models import Post

class PostSerializer(serializers.ModelSerializer):
    # This safely grabs the author's name without exposing the whole user object
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 
            'title', 
            'slug', 
            'author_name', 
            'content', 
            'excerpt', 
            'status', 
            'cover_image', 
            'created_at'
        ]