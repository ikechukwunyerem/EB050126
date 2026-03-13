# search/models.py
from django.db import models
from django.conf import settings


class SearchLog(models.Model):
    """
    Automatic server-side analytics. Written asynchronously on every search
    request via Celery so it never adds latency to the search response.

    Anonymous searches are recorded with user=None so we capture the full
    picture of what people search for, not just logged-in users.

    This table is internal — never exposed to end users directly.
    Use the admin or a BI tool to query it.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='search_logs',
        help_text='Null for anonymous searches.',
    )
    query = models.CharField(max_length=200, db_index=True)

    # Per-type result counts let you see which content types are most discoverable
    result_count = models.PositiveSmallIntegerField(default=0)
    resource_count = models.PositiveSmallIntegerField(default=0)
    product_count = models.PositiveSmallIntegerField(default=0)
    post_count = models.PositiveSmallIntegerField(default=0)

    # Useful for knowing how often the cache is actually being hit
    was_cached = models.BooleanField(default=False)

    searched_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-searched_at']
        verbose_name = 'Search Log'
        verbose_name_plural = 'Search Logs'
        indexes = [
            # Composite index for "top queries in time range" analytics queries
            models.Index(fields=['query', 'searched_at'], name='searchlog_query_time_idx'),
        ]

    def __str__(self):
        user_label = self.user.email if self.user else 'anonymous'
        return f'"{self.query}" by {user_label} — {self.result_count} results'


class SavedSearch(models.Model):
    """
    User-initiated search bookmarks. Only authenticated users can save searches.
    Allows users to quickly re-run a query they care about.

    unique_together ensures a user can't bookmark the same query twice.
    The optional `label` lets them give it a friendly name,
    e.g. "My maths resources" for query "maths worksheet".
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_searches',
    )
    query = models.CharField(max_length=200)
    label = models.CharField(
        max_length=100,
        blank=True,
        help_text='Optional friendly name, e.g. "My maths worksheets".',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'query')
        ordering = ['-created_at']
        verbose_name = 'Saved Search'
        verbose_name_plural = 'Saved Searches'

    def __str__(self):
        label = self.label or self.query
        return f'{self.user.email} — "{label}"'