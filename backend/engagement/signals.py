# engagement/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction

from .models import Rating, Comment


@receiver([post_save, post_delete], sender=Rating)
def handle_rating_change(sender, instance, **kwargs):
    """
    Issue #4 / #12: delegates recalculation to a Celery task via
    transaction.on_commit so:
    1. The task only fires after the DB row is fully committed
    2. The request thread is not blocked by the recalculation
    """
    transaction.on_commit(
        lambda: _queue_rating_recalc(instance.target_type, instance.target_id)
    )


@receiver([post_save, post_delete], sender=Comment)
def handle_comment_change(sender, instance, **kwargs):
    """
    Issue #3 / #12: same pattern — defer to Celery via on_commit.
    """
    transaction.on_commit(
        lambda: _queue_comment_recalc(instance.target_type, instance.target_id)
    )


def _queue_rating_recalc(target_type, target_id):
    from .tasks import recalculate_rating_summary
    recalculate_rating_summary.delay(target_type, target_id)


def _queue_comment_recalc(target_type, target_id):
    from .tasks import recalculate_comment_summary
    recalculate_comment_summary.delay(target_type, target_id)