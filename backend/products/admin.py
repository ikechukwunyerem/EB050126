# products/admin.py
from django.contrib import admin
from .models import Product, ProductCategory

@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    # Added 'is_featured' to the columns so you can see it at a glance
    list_display = ('name', 'product_type', 'price', 'stock', 'is_active', 'is_featured')
    
    # Allows you to check the box and change prices/stock directly from the list page
    list_editable = ('price', 'stock', 'is_active', 'is_featured')
    
    # Added 'is_featured' to the right-side filter menu
    list_filter = ('product_type', 'is_active', 'is_featured', 'category')
    
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('thumbnail',) # Celery will handle this later if we set up the signals