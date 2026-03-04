# endpoints/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from userauth.views import GoogleLoginView
from resources.views import ResourceViewSet, CategoryViewSet

# --- DRF Router Setup ---
router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'resources', ResourceViewSet, basename='resource')

urlpatterns = [
    # Auth Endpoints
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/google/', GoogleLoginView.as_view(), name='google_login'),
    
    # Domain Endpoints
    path('', include(router.urls)),
]