# endpoints/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from userauth.views import GoogleLoginView, MyTokenObtainPairView, RegisterView, AddressListCreateView, AddressDetailView, UserProfileView
from resources.views import ResourceViewSet, CategoryViewSet, HeroSlideListView
from cart.views import CartAPIView
from products.views import ProductViewSet, ProductCategoryViewSet
from orders.views import CheckoutAPIView
from payments.views import InitializePaystackView, PaystackWebhookView, InitializeSubscriptionView
from engagement.views import TargetCommentListCreateView
from subscriptions.views import SubscriptionPlanListView, UserSubscriptionStatusView
from search.views import GlobalSearchView
from blog.views import PostViewSet

# DRF Router Setup 
router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'product-categories', ProductCategoryViewSet, basename='product-category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'blog', PostViewSet, basename='blog')

urlpatterns = [
    # Auth Endpoints
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', MyTokenObtainPairView.as_view(), name='auth_login'),
    path('auth/google/', GoogleLoginView.as_view(), name='auth_google'),
    path('auth/profile/', UserProfileView.as_view(), name='user_profile'),
    
    # E-commerce Flow (Cart, Checkout, Payments)
    path('cart/', CartAPIView.as_view(), name='cart_api'),
    path('checkout/', CheckoutAPIView.as_view(), name='checkout_api'), 
    path('auth/addresses/', AddressListCreateView.as_view(), name='address_list_create'),
    path('auth/addresses/<int:pk>/', AddressDetailView.as_view(), name='address_detail'),
    
    path('payment/paystack/initialize/', InitializePaystackView.as_view(), name='paystack_init'),
    path('payment/paystack/subscribe/', InitializeSubscriptionView.as_view(), name='paystack_subscribe'),
    path('payment/paystack/webhook/', PaystackWebhookView.as_view(), name='paystack_webhook'), 
    
    # Engagement (Comments for ANY target type)
    path('engagement/<str:target_type>/<int:target_id>/comments/', TargetCommentListCreateView.as_view(), name='target_comments'),

    # Subscriptions 
    path('subscriptions/plans/', SubscriptionPlanListView.as_view(), name='subscription_plans'),
    path('subscriptions/my-status/', UserSubscriptionStatusView.as_view(), name='my_subscription_status'),
    
    # Search Endpoint
    path('search/', GlobalSearchView.as_view(), name='global_search'),
    
    # Domain Endpoints (Resources & Products handled by Router)
    path('', include(router.urls)),
    path('storefront/slides/', HeroSlideListView.as_view(), name='hero-slides'),
]