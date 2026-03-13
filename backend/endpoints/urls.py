# endpoints/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from resources.views import ResourceViewSet, CategoryViewSet, HeroSlideListView
from cart.views import CartAPIView
from products.views import ProductViewSet, ProductCategoryViewSet
from orders.views import CheckoutAPIView, OrderListView, OrderDetailView
from payments.views import InitializePaystackView, PaystackWebhookView, InitializeSubscriptionView
from engagement.views import (
    TargetCommentListCreateView,
    CommentDetailView,
    SubmitRatingView,
    EngagementSummaryView,
)
from subscriptions.views import SubscriptionPlanListView, UserSubscriptionStatusView, UserSubscriptionHistoryView
from search.views import GlobalSearchView, SavedSearchListCreateView, SavedSearchDeleteView
from blog.views import PostViewSet

# ---------------------------------------------------------------------------
# DRF Router — ViewSet-based endpoints
# ---------------------------------------------------------------------------
router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'product-categories', ProductCategoryViewSet, basename='product-category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'blog', PostViewSet, basename='blog')

urlpatterns = [

    # --- Auth (delegated to userauth app with namespace) ---
    # All userauth routes live under /api/auth/ and are reversible via
    # reverse('userauth:<name>') e.g. reverse('userauth:verify-email', ...)
    path('auth/', include('userauth.urls', namespace='userauth')),

    # --- E-commerce ---
    path('cart/', CartAPIView.as_view(), name='cart_api'),
    path('checkout/', CheckoutAPIView.as_view(), name='checkout_api'),
    path('orders/', OrderListView.as_view(), name='order_list'),
    path('orders/<str:order_number>/', OrderDetailView.as_view(), name='order_detail'),

    # --- Payments ---
    path('payment/paystack/initialize/', InitializePaystackView.as_view(), name='paystack_init'),
    path('payment/paystack/subscribe/', InitializeSubscriptionView.as_view(), name='paystack_subscribe'),
    path('payment/paystack/webhook/', PaystackWebhookView.as_view(), name='paystack_webhook'),

    # --- Engagement ---
    path(
        'engagement/<str:target_type>/<int:target_id>/comments/',
        TargetCommentListCreateView.as_view(),
        name='target_comments',
    ),
    path(
        'engagement/comments/<int:pk>/',
        CommentDetailView.as_view(),
        name='comment_detail',
    ),
    path(
        'engagement/<str:target_type>/<int:target_id>/rate/',
        SubmitRatingView.as_view(),
        name='submit_rating',
    ),
    path(
        'engagement/<str:target_type>/<int:target_id>/summary/',
        EngagementSummaryView.as_view(),
        name='engagement_summary',
    ),

    # --- Subscriptions ---
    path('subscriptions/plans/', SubscriptionPlanListView.as_view(), name='subscription_plans'),
    path('subscriptions/my-status/', UserSubscriptionStatusView.as_view(), name='my_subscription_status'),
    path('subscriptions/history/', UserSubscriptionHistoryView.as_view(), name='subscription_history'),

    # --- Newsletter ---
    path('newsletter/', include('newsletter.urls', namespace='newsletter')),
    path('billing/', include('billing.urls', namespace='billing')),

    # --- Search ---
    path('search/', GlobalSearchView.as_view(), name='global_search'),
    path('search/saved/', SavedSearchListCreateView.as_view(), name='saved_search_list'),
    path('search/saved/<int:pk>/', SavedSearchDeleteView.as_view(), name='saved_search_delete'),

    # --- Domain ViewSets (resources, products, blog, categories) ---
    path('', include(router.urls)),

    # --- Storefront ---
    path('storefront/slides/', HeroSlideListView.as_view(), name='hero-slides'),
]