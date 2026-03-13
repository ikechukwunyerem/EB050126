# resources/views.py
import logging
from rest_framework import viewsets, generics, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend

from .models import Category, Resource, SavedResource, HeroSlide
from .serializers import (
    CategorySerializer,
    ResourceListSerializer,
    ResourceDetailSerializer,
    SavedResourceSerializer,
    HeroSlideSerializer,
)
from core.pagination import StandardResultsSetPagination

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Issue #10: ordered by MPTT tree fields so parent/child relationships
    are returned in correct tree order, not arbitrary DB order.
    Only returns root-level categories; children are nested inside each.
    """
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Return only root nodes — children are nested via the serializer
        return Category.objects.root_nodes().order_by('tree_id', 'lft')


# ---------------------------------------------------------------------------
# Resource
# ---------------------------------------------------------------------------

class ResourceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Issue #1: access control enforced via ResourceDetailSerializer.get_file().
    Issue #6: filtering by category, resource_type, access_level + search + pagination.
    """
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination

    # Issue #6: filter + search backends
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category__slug', 'resource_type', 'access_level', 'is_featured']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        return (
            Resource.objects
            .filter(status='published')
            .select_related('category')   # prevent N+1 on category
            .order_by('-created_at')
        )

    def get_serializer_class(self):
        # List view gets lightweight serializer (no file URL)
        # Detail view gets full serializer with conditional file access
        if self.action == 'retrieve':
            return ResourceDetailSerializer
        return ResourceListSerializer

    def get_serializer_context(self):
        # Ensure request is always in context so serializers can build absolute URLs
        # and check user authentication/subscription status
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    # Issue #11 / #14: bookmark endpoints as nested actions on the resource
    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated],
        url_path='save',
    )
    def save_resource(self, request, pk=None):
        """POST /api/resources/{id}/save/ — bookmark this resource."""
        resource = self.get_object()
        serializer = SavedResourceSerializer(
            data={'resource_id': resource.pk},
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.info(f'User {request.user.email} saved resource: {resource.title}')
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['delete'],
        permission_classes=[permissions.IsAuthenticated],
        url_path='unsave',
    )
    def unsave_resource(self, request, pk=None):
        """DELETE /api/resources/{id}/unsave/ — remove bookmark."""
        resource = self.get_object()
        deleted, _ = SavedResource.objects.filter(
            user=request.user, resource=resource
        ).delete()
        if not deleted:
            raise ValidationError({'detail': 'This resource is not in your saved list.'})
        logger.info(f'User {request.user.email} unsaved resource: {resource.title}')
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated],
        url_path='saved',
    )
    def saved_resources(self, request):
        """GET /api/resources/saved/ — list the authenticated user's bookmarks."""
        entries = (
            SavedResource.objects
            .filter(user=request.user)
            .select_related('resource__category')
            .order_by('-saved_at')
        )
        page = self.paginate_queryset(entries)
        if page is not None:
            serializer = SavedResourceSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)

        serializer = SavedResourceSerializer(entries, many=True, context={'request': request})
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# HeroSlide
# ---------------------------------------------------------------------------

class HeroSlideListView(generics.ListAPIView):
    """Returns all active slides for the homepage carousel."""
    queryset = HeroSlide.objects.filter(is_active=True).order_by('display_order')
    serializer_class = HeroSlideSerializer
    permission_classes = [permissions.AllowAny]