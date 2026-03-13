# blog/admin.py
from django.contrib import admin
from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at', 'author')

    # Issue #9: 'content' removed from search_fields — it causes a full ILIKE
    # scan on potentially large HTML text, bypassing the GIN index entirely.
    search_fields = ('title', 'excerpt')

    # Issue #2: slug is read-only after creation to prevent published post URLs
    # from being silently broken when an admin edits a post title.
    # Issue #12: created_at and updated_at added to readonly_fields.
    readonly_fields = ('slug', 'search_vector', 'created_at', 'updated_at')

    fieldsets = (
        ('Content', {
            'fields': ('title', 'slug', 'author', 'content', 'excerpt'),
        }),
        ('Media', {
            'fields': ('cover_image',),
            # cover_thumbnail and cover_hero are virtual ImageSpecFields —
            # they are not editable and don't appear in admin fieldsets.
        }),
        ('Publishing', {
            'fields': ('status',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
        ('Search Index (Auto-generated)', {
            'fields': ('search_vector',),
            'classes': ('collapse',),
        }),
    )