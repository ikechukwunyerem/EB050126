# subscriptions/views.py
from rest_framework import generics, permissions
from rest_framework.response import Response

from core.pagination import StandardResultsSetPagination
from .models import SubscriptionPlan, UserSubscription
from .serializers import (
    SubscriptionPlanSerializer,
    UserSubscriptionSerializer,
    UserSubscriptionHistorySerializer,
)


class SubscriptionPlanListView(generics.ListAPIView):
    """
    GET /subscriptions/plans/

    Public — returns all active plans with their prices.
    Used by the Pricing page.
    """
    # Issue #3: prefetch_related prevents N+1 queries on nested prices
    queryset = (
        SubscriptionPlan.objects
        .filter(is_active=True)
        .prefetch_related('prices')
    )
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]


class UserSubscriptionStatusView(generics.RetrieveAPIView):
    """
    GET /subscriptions/me/

    Issue #9: RetrieveAPIView instead of raw APIView.
    Issue #1: filters by is_current=True to handle users with subscription history.
    Issue #5: consistent response shape — returns null-field object when no subscription
              exists rather than a completely different dict structure.
    """
    serializer_class = UserSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return (
            UserSubscription.objects
            .filter(user=self.request.user, is_current=True)
            .select_related('plan')
            .prefetch_related('plan__prices')
            .first()
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        # Issue #5: no subscription → return consistent null shape instead of
        # a different dict that forces the frontend to branch on key existence.
        if instance is None:
            return Response({
                'id': None,
                'plan': None,
                'status': 'none',
                'is_valid': False,
                'days_remaining': 0,
                'current_period_start': None,
                'current_period_end': None,
                'cancel_at_period_end': False,
                'is_current': False,
            })

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class UserSubscriptionHistoryView(generics.ListAPIView):
    """
    GET /subscriptions/history/

    Issue #8: returns the full subscription history for the authenticated user,
    ordered newest first. Useful for a billing history page.
    """
    serializer_class = UserSubscriptionHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return (
            UserSubscription.objects
            .filter(user=self.request.user)
            .select_related('plan')
            .order_by('-created_at')
        )