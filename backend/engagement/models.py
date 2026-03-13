# engagement/models.py
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

TARGET_TYPES = [
    ('resource', 'Resource'),
    ('product', 'Product'),
    ('blogpost', 'Blogpost'),
]

# Exposed as a set for O(1) validation in views
VALID_TARGET_TYPES = {t[0] for t in TARGET_TYPES}

# Issue #18: maximum nesting depth for threaded comments
MAX_COMMENT_DEPTH = 3


class EngagementSummary(models.Model):
    """
    Pre-calculated engagement stats per target object.
    Updated asynchronously via Celery tasks triggered by signals.
    Never query Comment/Rating aggregates on the fly — read from here instead.
    """
    target_type = models.CharField(max_length=20, choices=TARGET_TYPES, db_index=True)
    target_id = models.PositiveIntegerField(db_index=True)

    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    rating_count = models.PositiveIntegerField(default=0)

    # Star distribution — one column per star level for fast histogram rendering
    star_1 = models.PositiveIntegerField(default=0)
    star_2 = models.PositiveIntegerField(default=0)
    star_3 = models.PositiveIntegerField(default=0)
    star_4 = models.PositiveIntegerField(default=0)
    star_5 = models.PositiveIntegerField(default=0)

    # Issue #19: top-level comments only (parent=None, not deleted)
    # Replies are excluded — comment_count reflects the number of discussion threads
    comment_count = models.PositiveIntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('target_type', 'target_id')
        verbose_name_plural = 'Engagement Summaries'

    def __str__(self):
        return f'Stats for {self.target_type}_{self.target_id}'


class Rating(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ratings',
    )
    target_type = models.CharField(max_length=20, choices=TARGET_TYPES, db_index=True)
    target_id = models.PositiveIntegerField(db_index=True)
    score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'target_type', 'target_id')

    def __str__(self):
        return f'{self.score}★ by {self.user.email} on {self.target_type}_{self.target_id}'


class Comment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    target_type = models.CharField(max_length=20, choices=TARGET_TYPES, db_index=True)
    target_id = models.PositiveIntegerField(db_index=True)

    # Threaded replies — parent=None means top-level comment
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies',
    )

    # Issue #18: tracks nesting depth so we can enforce MAX_COMMENT_DEPTH
    depth = models.PositiveSmallIntegerField(default=0, editable=False)

    content = models.TextField()

    # Soft delete — hides content but preserves thread structure
    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_type', 'target_id', 'parent']),
        ]

    def save(self, *args, **kwargs):
        # Auto-calculate depth from parent on first save
        if self.parent_id and not self.pk:
            self.depth = self.parent.depth + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Comment by {self.user.email} on {self.target_type}_{self.target_id}'