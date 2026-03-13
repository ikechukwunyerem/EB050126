# userauth/admin.py
from django.contrib import admin
from django.utils.html import format_html

from .models import User, Profile, Address


# ---------------------------------------------------------------------------
# Inlines
# ---------------------------------------------------------------------------

class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'
    fk_name = 'user'
    fields = ('image', 'about', 'gender')


class AddressInline(admin.TabularInline):
    """Point #20: view and manage addresses directly on the User admin page."""
    model = Address
    extra = 0
    fields = (
        'address_type', 'recipient_name', 'address_line1',
        'city', 'postal_code', 'country',
        'is_default_shipping', 'is_default_billing',
    )
    readonly_fields = ('created_at',)


# ---------------------------------------------------------------------------
# UserAdmin
# ---------------------------------------------------------------------------

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    inlines = (ProfileInline, AddressInline)

    list_display = [
        'email', 'username', 'first_name', 'last_name',
        'phone', 'is_active', 'email_verified',
        'is_staff', 'date_joined',
    ]
    list_filter = ['is_active', 'is_staff', 'is_superuser', 'email_verified', 'date_joined']
    search_fields = ['email', 'username', 'first_name', 'last_name', 'phone']
    ordering = ('email',)
    filter_horizontal = ('groups', 'user_permissions')
    readonly_fields = ('last_login', 'date_joined')

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('username', 'first_name', 'last_name', 'phone')}),
        ('Permissions', {
            'fields': ('is_active', 'email_verified', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )


# ---------------------------------------------------------------------------
# ProfileAdmin
# ---------------------------------------------------------------------------

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user_display', 'gender', 'image_thumbnail', 'date_joined_display']
    list_filter = ['gender']
    search_fields = ['user__email', 'user__username', 'user__first_name', 'user__last_name', 'about']
    raw_id_fields = ['user']
    readonly_fields = ('date_joined_display',)

    fieldsets = (
        (None, {'fields': ('user', 'image', 'about', 'gender')}),
        ('Important Dates', {'fields': ('date_joined_display',)}),
    )
    ordering = ('user__email',)

    @admin.display(description='User', ordering='user__email')
    def user_display(self, obj):
        return obj.user.email

    @admin.display(description='Date Joined')
    def date_joined_display(self, obj):
        return obj.date_joined.strftime('%Y-%m-%d %H:%M') if obj.date_joined else '—'

    @admin.display(description='Avatar')
    def image_thumbnail(self, obj):
        """Point #22: render a small preview in the admin list view."""
        if obj.image and hasattr(obj.image, 'url'):
            return format_html(
                '<img src="{}" style="max-height:50px; max-width:50px; border-radius:4px;" />',
                obj.image.url,
            )
        return '(none)'


# ---------------------------------------------------------------------------
# AddressAdmin
# ---------------------------------------------------------------------------

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    """Point #21: standalone admin for Address with full search, filters, and fieldsets."""
    list_display = (
        'user_email_display', 'address_type', 'recipient_name',
        'city', 'country', 'is_default_shipping', 'is_default_billing', 'updated_at',
    )
    list_filter = ('address_type', 'country', 'is_default_shipping', 'is_default_billing')
    search_fields = ('user__email', 'recipient_name', 'address_line1', 'city', 'postal_code', 'country')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 25

    fieldsets = (
        (None, {'fields': ('user', 'address_type', 'recipient_name')}),
        ('Address Details', {
            'fields': ('address_line1', 'address_line2', 'city', 'state_province_county', 'postal_code', 'country', 'phone_number'),
        }),
        ('Defaults', {'fields': ('is_default_shipping', 'is_default_billing')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    @admin.display(description='User', ordering='user__email')
    def user_email_display(self, obj):
        return obj.user.email