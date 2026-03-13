# engagement/admin.py
from django.contrib import admin
from django.utils.html import format_html

from .models import Comment, Rating, EngagementSummary


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'target_link', 'depth', 'short_content', 'is_deleted', 'created_at',
    )
    list_filter = ('target_type', 'is_deleted', 'depth', 'created_at')
    search_fields = ('user__email', 'content')
    readonly_fields = ('target_type', 'target_id', 'user', 'parent', 'depth', 'created_at', 'edited_at')

    fieldsets = (
        ('Comment', {
            'fields': ('user', 'target_type', 'target_id', 'parent', 'depth', 'content'),
        }),
        ('Moderation', {
            'fields': ('is_deleted',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'edited_at'),
            'classes': ('collapse',),
        }),
    )

    def short_content(self, obj):
        text = '[deleted]' if obj.is_deleted else obj.content
        return text[:60] + '…' if len(text) > 60 else text
    short_content.short_description = 'Content'

    # Issue #15: display target as formatted string with type context
    def target_link(self, obj):
        return format_html(
            '<span style="font-family:monospace">{} #{}</span>',
            obj.target_type,
            obj.target_id,
        )
    target_link.short_description = 'Target'


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('user', 'target_type', 'target_id', 'score', 'created_at')
    list_filter = ('target_type', 'score')
    search_fields = ('user__email',)
    readonly_fields = ('user', 'target_type', 'target_id', 'score', 'created_at', 'updated_at')

    def has_add_permission(self, request):
        # Ratings are submitted via the API only
        return False


@admin.register(EngagementSummary)
class EngagementSummaryAdmin(admin.ModelAdmin):
    list_display = (
        'target_type', 'target_id', 'avg_rating',
        'rating_count', 'comment_count', 'updated_at',
    )
    list_filter = ('target_type',)
    readonly_fields = (
        'target_type', 'target_id',
        'avg_rating', 'rating_count',
        'star_1', 'star_2', 'star_3', 'star_4', 'star_5',
        'comment_count', 'updated_at',
    )

    def has_add_permission(self, request):
        # Summaries are managed by Celery tasks only
        return False

    def has_change_permission(self, request, obj=None):
        return False