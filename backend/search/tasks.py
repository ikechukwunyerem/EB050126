# search/tasks.py
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=5)
def log_search(self, user_id, query, result_count,
               resource_count, product_count, post_count, was_cached):
    """
    Writes a SearchLog row asynchronously so the search response is never
    blocked by the DB write.

    Called via transaction.on_commit in the view so the task only fires
    after the response has been sent.

    All arguments are primitives (no model instances) so Celery can
    serialise them cleanly to JSON without pickling.
    """
    from .models import SearchLog
    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        user = User.objects.get(pk=user_id) if user_id else None

        SearchLog.objects.create(
            user=user,
            query=query,
            result_count=result_count,
            resource_count=resource_count,
            product_count=product_count,
            post_count=post_count,
            was_cached=was_cached,
        )
        logger.debug(
            'SearchLog written: q=%r user=%s results=%d cached=%s',
            query, user_id or 'anon', result_count, was_cached,
        )
    except Exception as exc:
        # Search logging is non-critical — log the error but retry quietly
        logger.warning('log_search task failed: %s', exc, exc_info=True)
        raise self.retry(exc=exc)