# blog/views.py
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Post
from .serializers import PostSerializer

class PostViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A viewset that provides default `list()` and `retrieve()` actions
    for published blog posts.
    """
    queryset = Post.objects.filter(status='published').order_by('-created_at')
    serializer_class = PostSerializer
    lookup_field = 'slug'  # Allows frontend to fetch via /api/blog/my-post-slug/
    permission_classes = [AllowAny]