# engagement/admin.py
from django.contrib import admin
from .models import Comment, Rating, EngagementSummary

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'target_type', 'target_id', 'short_content', 'is_deleted', 'created_at')
    list_filter = ('target_type', 'is_deleted', 'created_at')
    search_fields = ('user__email', 'content')
    
    def short_content(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    short_content.short_description = 'Content'

@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('user', 'target_type', 'target_id', 'score', 'created_at')
    list_filter = ('target_type', 'score')

@admin.register(EngagementSummary)
class EngagementSummaryAdmin(admin.ModelAdmin):
    list_display = ('target_type', 'target_id', 'avg_rating', 'rating_count', 'comment_count')
    list_filter = ('target_type',)