# subscriptions/serializers.py
from rest_framework import serializers
from .models import SubscriptionPlan, PlanPrice, UserSubscription


class PlanPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanPrice
        fields = ['currency', 'amount']


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    prices = PlanPriceSerializer(many=True, read_only=True)

    class Meta:
        model = SubscriptionPlan
        # Issue #10: is_active omitted — the list view already filters to active
        # plans only, so every record returned would have is_active=True anyway.
        fields = ['id', 'name', 'slug', 'description', 'duration_days', 'prices']


class UserSubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer for the authenticated user's current subscription.
    Always returns a consistent shape whether subscribed or not
    (null fields vs populated fields) — Issue #5.
    """
    plan = SubscriptionPlanSerializer(read_only=True)

    # Issue #6 / #13: is_valid is now a @property on the model so ReadOnlyField
    # works correctly — it accesses it as an attribute, not a method call.
    is_valid = serializers.ReadOnlyField()

    # Issue #13 / #12: days_remaining is also a @property on the model
    days_remaining = serializers.ReadOnlyField()

    class Meta:
        model = UserSubscription
        fields = [
            'id',
            'plan',
            'status',
            'is_valid',
            'days_remaining',
            'current_period_start',
            'current_period_end',
            'cancel_at_period_end',
            'is_current',
        ]
        read_only_fields = fields


class UserSubscriptionHistorySerializer(serializers.ModelSerializer):
    """Lightweight serializer for the history list — plan name only, no nesting."""
    plan_name = serializers.ReadOnlyField(source='plan.name')
    plan_slug = serializers.ReadOnlyField(source='plan.slug')
    is_valid = serializers.ReadOnlyField()

    class Meta:
        model = UserSubscription
        fields = [
            'id',
            'plan_name',
            'plan_slug',
            'status',
            'is_valid',
            'is_current',
            'current_period_start',
            'current_period_end',
            'cancel_at_period_end',
            'created_at',
        ]