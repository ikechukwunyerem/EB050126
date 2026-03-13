# search/admin.py
from django.contrib import admin
from django.db.models import Count
from .models import SearchLog, SavedSearch


@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = (
        'query', 'user', 'result_count', 'resource_count',
        'product_count', 'post_count', 'was_cached', 'searched_at',
    )
    list_filter = ('was_cached', 'searched_at')
    search_fields = ('query', 'user__email')
    readonly_fields = (
        'query', 'user', 'result_count', 'resource_count',
        'product_count', 'post_count', 'was_cached', 'searched_at',
    )
    date_hierarchy = 'searched_at'

    # Useful analytics shortcut: top queries by volume
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        top_queries = (
            SearchLog.objects
            .values('query')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        extra_context['top_queries'] = top_queries
        return super().changelist_view(request, extra_context=extra_context)

    def has_add_permission(self, request):
        # Logs are written by the system only
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    list_display = ('user', 'query', 'label', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'query', 'label')
    readonly_fields = ('user', 'query', 'created_at')