# engagement/tasks.py
import logging
from celery import shared_task
from django.db import transaction
from django.db.models import Avg, Count

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def recalculate_rating_summary(self, target_type, target_id):
    """
    Issue #2 / #4 / #12:
    - Single aggregation query replaces 5 separate COUNT calls
    - Runs inside select_for_update() to prevent race conditions
    - Offloaded to Celery so it doesn't block the request thread
    """
    from .models import Rating, EngagementSummary

    try:
        with transaction.atomic():
            # Lock the summary row for the duration of this update
            summary, _ = EngagementSummary.objects.select_for_update().get_or_create(
                target_type=target_type,
                target_id=target_id,
            )

            ratings = Rating.objects.filter(
                target_type=target_type,
                target_id=target_id,
            )

            # Issue #2: single aggregate query for avg + total
            agg = ratings.aggregate(avg=Avg('score'), total=Count('id'))
            summary.avg_rating = agg['avg'] or 0.00
            summary.rating_count = agg['total'] or 0

            # Issue #2: single query for star distribution using values/annotate
            star_counts = {
                row['score']: row['count']
                for row in ratings.values('score').annotate(count=Count('id'))
            }
            for i in range(1, 6):
                setattr(summary, f'star_{i}', star_counts.get(i, 0))

            summary.save()

        logger.info(
            'Rating summary updated: %s/%s — avg=%.2f count=%d',
            target_type, target_id, summary.avg_rating, summary.rating_count,
        )

    except Exception as exc:
        logger.error(
            'recalculate_rating_summary failed for %s/%s: %s',
            target_type, target_id, exc, exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def recalculate_comment_summary(self, target_type, target_id):
    """
    Issue #3 / #12 / #19:
    - Atomic update inside select_for_update() prevents race conditions
    - Counts top-level non-deleted comments only (parent=None, is_deleted=False)
    - Offloaded to Celery so it doesn't block the request thread
    """
    from .models import Comment, EngagementSummary

    try:
        with transaction.atomic():
            summary, _ = EngagementSummary.objects.select_for_update().get_or_create(
                target_type=target_type,
                target_id=target_id,
            )

            # Issue #19: top-level only (parent=None) and not soft-deleted
            summary.comment_count = Comment.objects.filter(
                target_type=target_type,
                target_id=target_id,
                parent__isnull=True,
                is_deleted=False,
            ).count()

            summary.save(update_fields=['comment_count', 'updated_at'])

        logger.info(
            'Comment summary updated: %s/%s — count=%d',
            target_type, target_id, summary.comment_count,
        )

    except Exception as exc:
        logger.error(
            'recalculate_comment_summary failed for %s/%s: %s',
            target_type, target_id, exc, exc_info=True,
        )
        raise self.retry(exc=exc)