# resources/views.py
from rest_framework import viewsets, permissions, generics
from .models import Resource, Category, HeroSlide
from .serializers import ResourceSerializer, CategorySerializer, HeroSlideSerializer

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny] # Categories are public

class ResourceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ResourceSerializer
    permission_classes = [permissions.AllowAny] # We will enforce download logic later
    
    def get_queryset(self):
        # Only expose published resources to the frontend
        return Resource.objects.filter(status='published').order_by('-created_at')

class HeroSlideListView(generics.ListAPIView):
    """Fetches all active slides for the homepage."""
    queryset = HeroSlide.objects.filter(is_active=True).order_by('display_order')
    serializer_class = HeroSlideSerializer
    permission_classes = [permissions.AllowAny] # Anyone can see the homepage