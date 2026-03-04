# engagement/models.py
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

TARGET_TYPES = [
    ('resource', 'Resource'),
    ('product', 'Product'),
    ('blogpost', 'Blogpost'),
]

class EngagementSummary(models.Model):
    """Stores pre-calculated stats so we don't do expensive math on every page load"""
    target_type = models.CharField(max_length=20, choices=TARGET_TYPES, db_index=True)
    target_id = models.PositiveIntegerField(db_index=True)
    
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    rating_count = models.PositiveIntegerField(default=0)
    
    # Star distribution
    star_1 = models.PositiveIntegerField(default=0)
    star_2 = models.PositiveIntegerField(default=0)
    star_3 = models.PositiveIntegerField(default=0)
    star_4 = models.PositiveIntegerField(default=0)
    star_5 = models.PositiveIntegerField(default=0)
    
    comment_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('target_type', 'target_id')
        verbose_name_plural = "Engagement Summaries"

    def __str__(self):
        return f"Stats for {self.target_type}_{self.target_id}"


class Rating(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    target_type = models.CharField(max_length=20, choices=TARGET_TYPES, db_index=True)
    target_id = models.PositiveIntegerField(db_index=True)
    score = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Enforce exactly one rating per user per target
        unique_together = ('user', 'target_type', 'target_id')

    def __str__(self):
        return f"{self.score}★ by {self.user.email} on {self.target_type}_{self.target_id}"


class Comment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    target_type = models.CharField(max_length=20, choices=TARGET_TYPES, db_index=True)
    target_id = models.PositiveIntegerField(db_index=True)
    
    # Infinite threading: replies point to another comment
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    content = models.TextField()
    
    is_deleted = models.BooleanField(default=False) # Soft delete (hides content but keeps replies)
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Comment by {self.user.email} on {self.target_type}_{self.target_id}"