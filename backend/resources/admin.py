# resources/admin.py
from django.contrib import admin
from mptt.admin import MPTTModelAdmin   # Issue #13: proper tree display

from .models import Category, Resource, SavedResource, HeroSlide


@admin.register(Category)
class CategoryAdmin(MPTTModelAdmin):
    """Issue #13: renders categories as an indented tree instead of a flat list."""
    list_display = ('name', 'slug', 'parent')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    mptt_level_indent = 20


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'resource_type', 'access_level', 'status', 'is_featured', 'created_at')
    list_editable = ('access_level', 'is_featured', 'status')
    list_filter = ('resource_type', 'access_level', 'status', 'is_featured', 'created_at')
    search_fields = ('title', 'description')
    readonly_fields = ('created_at', 'updated_at', 'slug')

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'slug', 'resource_type', 'category', 'description'),
        }),
        ('Access & Visibility', {
            'fields': ('access_level', 'status', 'is_featured'),
            'description': (
                'Set Access Level to "Free" to make this resource freely downloadable. '
                '"Subscriber Only" requires an active subscription.'
            ),
        }),
        ('Files & Media', {
            # thumbnail_card/thumbnail_hero are virtual ImageSpecFields — not editable
            'fields': ('file', 'cover_image'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(SavedResource)
class SavedResourceAdmin(admin.ModelAdmin):
    list_display = ('user', 'resource', 'saved_at')
    search_fields = ('user__email', 'resource__title')
    raw_id_fields = ('user', 'resource')
    readonly_fields = ('saved_at',)


@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active', 'display_order', 'link')
    list_editable = ('is_active', 'display_order')
    search_fields = ('title', 'subtitle')

    fieldsets = (
        ('Slide Content', {'fields': ('title', 'subtitle', 'image')}),
        ('Call to Action', {'fields': ('btn_text', 'link')}),
        ('Visibility & Ordering', {
            'fields': ('is_active', 'display_order'),
            'description': 'Lower display order numbers appear first.',
        }),
    )