# engagement/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count
from .models import Rating, Comment, EngagementSummary

def update_rating_summary(target_type, target_id):
    """Recalculates rating math and updates the summary table"""
    ratings = Rating.objects.filter(target_type=target_type, target_id=target_id)
    
    stats = ratings.aggregate(
        avg=Avg('score'),
        total=Count('id')
    )
    
    summary, created = EngagementSummary.objects.get_or_create(
        target_type=target_type, 
        target_id=target_id
    )
    
    summary.avg_rating = stats['avg'] or 0.00
    summary.rating_count = stats['total'] or 0
    
    # Update individual star distribution
    for i in range(1, 6):
        setattr(summary, f'star_{i}', ratings.filter(score=i).count())
        
    summary.save()

def update_comment_summary(target_type, target_id):
    """Recalculates total visible comments"""
    # Notice we strictly exclude soft-deleted comments
    total_comments = Comment.objects.filter(
        target_type=target_type, 
        target_id=target_id, 
        is_deleted=False
    ).count()
    
    summary, created = EngagementSummary.objects.get_or_create(
        target_type=target_type, 
        target_id=target_id
    )
    
    summary.comment_count = total_comments
    summary.save()

# --- Signal Listeners ---

@receiver([post_save, post_delete], sender=Rating)
def handle_rating_change(sender, instance, **kwargs):
    update_rating_summary(instance.target_type, instance.target_id)

@receiver([post_save, post_delete], sender=Comment)
def handle_comment_change(sender, instance, **kwargs):
    update_comment_summary(instance.target_type, instance.target_id)