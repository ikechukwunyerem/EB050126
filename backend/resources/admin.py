# resources/admin.py
from django.contrib import admin
from .models import Category, Resource, SavedResource

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'resource_type', 'access_level', 'status', 'created_at')
    list_filter = ('status', 'resource_type', 'access_level', 'category')
    search_fields = ('title', 'description')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('thumbnail',) # Celery populates this