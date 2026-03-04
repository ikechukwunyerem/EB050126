# subscriptions/admin.py
from django.contrib import admin
from .models import SubscriptionPlan, PlanPrice, UserSubscription

class PlanPriceInline(admin.TabularInline):
    model = PlanPrice
    extra = 1

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'duration_days', 'is_active')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [PlanPriceInline] # Allows adding prices directly inside the Plan

@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'status', 'current_period_end', 'is_valid')
    list_filter = ('status', 'plan')
    search_fields = ('user__email',)