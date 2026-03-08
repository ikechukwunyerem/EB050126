# blog/admin.py
from django.contrib import admin
from .models import Post

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    # Columns to display in the main list view
    list_display = ('title', 'author', 'status', 'created_at')
    
    # Filters on the right sidebar
    list_filter = ('status', 'created_at', 'author')
    
    # Adds a search bar at the top of the admin list
    search_fields = ('title', 'content', 'excerpt')
    
    # Automatically fills the slug field as you type the title
    prepopulated_fields = {'slug': ('title',)}
    
    # Prevents manual editing of the auto-calculated PostgreSQL FTS vector
    readonly_fields = ('search_vector',)
    
    # Organizes the actual post creation screen into clean sections
    fieldsets = (
        ('Content', {
            'fields': ('title', 'slug', 'author', 'content', 'excerpt')
        }),
        ('Media', {
            'fields': ('cover_image',)
        }),
        ('Publishing', {
            'fields': ('status',)
        }),
        ('Advanced (Auto-generated)', {
            'fields': ('search_vector',),
            'classes': ('collapse',) # Hides this section by default so it stays out of your way
        }),
    )