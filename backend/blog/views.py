# blog/views.py
from rest_framework import viewsets, filters
from rest_framework.permissions import AllowAny

from core.pagination import StandardResultsSetPagination
from .models import Post
from .serializers import PostListSerializer, PostDetailSerializer


class PostViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /blog/          — paginated list of published posts
    GET /blog/{slug}/   — full post detail

    Issue #3: pagination, search, and ordering added.
    Issue #4: select_related('author') prevents N+1 on author_name.
    Issue #5: list uses PostListSerializer (no content),
              detail uses PostDetailSerializer (full content + hero image).
    """
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    pagination_class = StandardResultsSetPagination

    # Issue #3: ?search=term hits title and excerpt (GIN-indexed fields)
    # Issue #9: content deliberately excluded from search_fields
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'excerpt']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        # Issue #4: select_related collapses author into the main query
        return (
            Post.objects
            .filter(status='published')
            .select_related('author')
            .order_by('-created_at')
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PostDetailSerializer
        return PostListSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context