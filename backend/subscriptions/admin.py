# subscriptions/admin.py
from django.contrib import admin
from .models import SubscriptionPlan, PlanPrice, UserSubscription


class PlanPriceInline(admin.TabularInline):
    model = PlanPrice
    extra = 1


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'duration_days', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)
    inlines = [PlanPriceInline]

    # Issue #11: slug is auto-generated on creation and should not be
    # overwritten via admin when a plan name is edited. Keeping it read-only
    # after creation prevents breaking frontend routes or Paystack metadata
    # that reference the existing slug.
    readonly_fields = ('slug',)

    fieldsets = (
        ('Plan Details', {
            'fields': ('name', 'slug', 'description', 'duration_days', 'is_active'),
        }),
    )


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'plan', 'status', 'is_current',
        'current_period_end', 'get_is_valid',
    )
    list_filter = ('status', 'plan', 'is_current')
    search_fields = ('user__email',)

    # Issue #7: is_current must be read-only in admin. Manually toggling it
    # without first setting the old record to False would violate the
    # UniqueConstraint(is_current=True) and raise an IntegrityError.
    # All subscription lifecycle changes must go through the payment webhook.
    readonly_fields = (
        'user', 'plan', 'status', 'is_current',
        'current_period_start', 'current_period_end',
        'cancel_at_period_end', 'created_at', 'updated_at',
    )

    fieldsets = (
        ('Subscription', {
            'fields': ('user', 'plan', 'status', 'is_current', 'cancel_at_period_end'),
        }),
        ('Period', {
            'fields': ('current_period_start', 'current_period_end'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    # Issue #2: is_valid is a @property — wrap it in an admin method so
    # Django knows to call it and can display a boolean icon.
    @admin.display(boolean=True, description='Is Valid')
    def get_is_valid(self, obj):
        return obj.is_valid

    def has_add_permission(self, request):
        # Subscriptions are created exclusively by the payment webhook
        return False