# endpoints/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from resources.views import ResourceViewSet, CategoryViewSet, HeroSlideListView
from cart.views import CartAPIView
from products.views import ProductViewSet, ProductCategoryViewSet
from engagement.views import (
    TargetCommentListCreateView,
    CommentDetailView,
    SubmitRatingView,
    EngagementSummaryView,
)
from search.views import GlobalSearchView, SavedSearchListCreateView, SavedSearchDeleteView
from blog.views import PostViewSet

# ---------------------------------------------------------------------------
# DRF Router — ViewSet-based endpoints
# ---------------------------------------------------------------------------
router = DefaultRouter()
router.register(r'categories',         CategoryViewSet,        basename='category')
router.register(r'resources',          ResourceViewSet,        basename='resource')
router.register(r'product-categories', ProductCategoryViewSet, basename='product-category')
router.register(r'products',           ProductViewSet,         basename='product')
router.register(r'blog',               PostViewSet,            basename='blog')

# ---------------------------------------------------------------------------
# URL patterns
# All routes are mounted under /api/ by the root urls.py
# ---------------------------------------------------------------------------
urlpatterns = [

    # --- Auth ---
    # Reversible via reverse('userauth:<name>'), e.g. reverse('userauth:login')
    path('auth/', include('userauth.urls', namespace='userauth')),

    # --- E-commerce ---
    path('cart/',   CartAPIView.as_view(), name='cart'),
    path('orders/', include('orders.urls', namespace='orders')),

    # --- Payments ---
    path('payment/', include('payments.urls', namespace='payments')),

    # --- Subscriptions ---
    path('subscriptions/', include('subscriptions.urls', namespace='subscriptions')),

    # --- Engagement ---
    path(
        'engagement/<str:target_type>/<int:target_id>/comments/',
        TargetCommentListCreateView.as_view(),
        name='target-comments',
    ),
    path(
        'engagement/comments/<int:pk>/',
        CommentDetailView.as_view(),
        name='comment-detail',
    ),
    path(
        'engagement/<str:target_type>/<int:target_id>/rate/',
        SubmitRatingView.as_view(),
        name='submit-rating',
    ),
    path(
        'engagement/<str:target_type>/<int:target_id>/summary/',
        EngagementSummaryView.as_view(),
        name='engagement-summary',
    ),

    # --- Newsletter ---
    path('newsletter/', include('newsletter.urls', namespace='newsletter')),

    # --- Billing / Invoices ---
    path('billing/', include('billing.urls', namespace='billing')),

    # --- Search ---
    path('search/',                GlobalSearchView.as_view(),          name='search'),
    path('search/saved/',          SavedSearchListCreateView.as_view(), name='saved-search-list'),
    path('search/saved/<int:pk>/', SavedSearchDeleteView.as_view(),     name='saved-search-delete'),

    # --- Domain ViewSets (resources, products, blog, categories) ---
    path('', include(router.urls)),

    # --- Storefront ---
    path('storefront/slides/', HeroSlideListView.as_view(), name='hero-slides'),
]