# subscriptions/serializers.py
from rest_framework import serializers
from .models import SubscriptionPlan, PlanPrice, UserSubscription

class PlanPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanPrice
        fields = ['currency', 'amount']

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    # Nest the prices so React sees [{currency: 'NGN', amount: 5000}]
    prices = PlanPriceSerializer(many=True, read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'name', 'slug', 'description', 'duration_days', 'is_active', 'prices']

class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.ReadOnlyField(source='plan.name')
    is_valid = serializers.ReadOnlyField() # Calls your custom helper method

    class Meta:
        model = UserSubscription
        fields = ['id', 'plan_name', 'status', 'current_period_start', 'current_period_end', 'cancel_at_period_end', 'is_valid']