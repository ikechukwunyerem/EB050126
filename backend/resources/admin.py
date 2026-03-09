# resources/admin.py
from django.contrib import admin
from .models import Resource, HeroSlide

@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    # What columns appear in the list view
    list_display = ('title', 'resource_type', 'is_free', 'is_featured', 'created_at')
    
    # Fields you can edit directly from the list view
    list_editable = ('is_free', 'is_featured')
    
    # Adds a filter sidebar on the right
    list_filter = ('resource_type', 'is_free', 'is_featured', 'created_at')
    
    # Adds a search bar at the top
    search_fields = ('title', 'description')
    
    # Organizes the detail view
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'resource_type', 'description')
        }),
        ('Access & Visibility', {
            'fields': ('is_free', 'is_featured')
        }),
        ('Files & Media', {
            'fields': ('cover_image', 'file')
        }),
    )


@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    # What columns appear in the list view
    list_display = ('title', 'is_active', 'display_order', 'link')
    
    # Allows you to quickly reorder slides or turn them off
    list_editable = ('is_active', 'display_order')
    
    # Adds a search bar
    search_fields = ('title', 'subtitle')
    
    # Organizes the detail view
    fieldsets = (
        ('Slide Content', {
            'fields': ('title', 'subtitle', 'image')
        }),
        ('Call to Action (Button)', {
            'fields': ('btn_text', 'link')
        }),
        ('Visibility & Ordering', {
            'fields': ('is_active', 'display_order'),
            'description': 'Lower display order numbers appear first. Uncheck "is_active" to hide the slide.'
        }),
    )