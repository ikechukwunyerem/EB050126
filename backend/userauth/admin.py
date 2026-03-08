# userauth/admin.py
from django.contrib import admin
from .models import User
from .models import Address

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'address_type', 'recipient_name', 'city', 'is_default_shipping', 'is_default_billing')
    list_filter = ('address_type', 'is_default_shipping')
    search_fields = ('user__email', 'recipient_name', 'city')