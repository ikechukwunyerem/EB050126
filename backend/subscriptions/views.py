# subscriptions/views.py
from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import SubscriptionPlan, UserSubscription
from .serializers import SubscriptionPlanSerializer, UserSubscriptionSerializer

class SubscriptionPlanListView(generics.ListAPIView):
    """Public endpoint to fetch all active plans and their prices (for the Pricing Page)"""
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]

class UserSubscriptionStatusView(APIView):
    """Private endpoint for React to check what access the logged-in user has"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            subscription = UserSubscription.objects.get(user=request.user)
            serializer = UserSubscriptionSerializer(subscription)
            return Response(serializer.data)
        except UserSubscription.DoesNotExist:
            # If they have no subscription row at all, we cleanly tell React they have nothing
            return Response({'status': 'none', 'is_valid': False})