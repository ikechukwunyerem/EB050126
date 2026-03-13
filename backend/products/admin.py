# products/admin.py
from django.contrib import admin
from .models import Product, ProductCategory


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'category', 'product_type', 'price',
        'stock', 'is_active', 'is_featured', 'created_at',
    )
    list_filter = ('product_type', 'is_active', 'is_featured', 'category')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at', 'search_vector')
    list_editable = ('is_active', 'is_featured', 'price')
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'category', 'product_type', 'description'),
        }),
        ('Media', {
            'fields': ('cover_image', 'thumbnail'),
        }),
        ('Pricing & Inventory', {
            'fields': ('price', 'stock', 'digital_file'),
        }),
        ('Visibility', {
            'fields': ('is_active', 'is_featured'),
        }),
        ('Metadata', {
            'classes': ('collapse',),
            'fields': ('search_vector', 'created_at', 'updated_at'),
        }),
    )