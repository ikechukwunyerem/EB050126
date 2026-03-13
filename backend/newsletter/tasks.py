# newsletter/tasks.py
import logging
from celery import shared_task, group
from django.db import transaction
from django.utils import timezone
from django.conf import settings

from notifications.tasks import send_generic_email_task

logger = logging.getLogger(__name__)


@shared_task(
    name='send_newsletter_issue_task',
    bind=True,
    max_retries=1,
    default_retry_delay=300,    # retry once after 5 minutes
)
def send_newsletter_issue_task(self, issue_id: int):
    """
    Sends a newsletter issue to all active subscribers.

    Uses Celery's `group` to batch all per-subscriber email tasks into a
    single broker message rather than flooding the broker with thousands of
    individual task dispatches.

    Marks the issue as sent after dispatching the group to the broker.
    Note: `is_sent=True` means the tasks were successfully enqueued, not
    that every email was delivered. Delivery failures are handled by
    send_generic_email_task's own retry logic.
    """
    from .models import NewsletterIssue, NewsletterSubscriber

    try:
        issue = NewsletterIssue.objects.get(pk=issue_id)
    except NewsletterIssue.DoesNotExist:
        logger.warning('send_newsletter_issue_task: Issue ID %d not found.', issue_id)
        return f'Issue {issue_id} not found.'

    if issue.is_sent:
        logger.info(
            'send_newsletter_issue_task: Issue %d ("%s") already sent. Skipping.',
            issue_id, issue.subject,
        )
        return f'Issue {issue_id} already sent.'

    subscribers = NewsletterSubscriber.objects.filter(is_active=True).values_list(
        'email', 'unsubscribe_token'
    )
    subscriber_count = subscribers.count()

    if subscriber_count == 0:
        logger.info(
            'send_newsletter_issue_task: No active subscribers for issue "%s". Marking as sent.',
            issue.subject,
        )
        issue.is_sent = True
        issue.sent_at = timezone.now()
        issue.save(update_fields=['is_sent', 'sent_at'])
        return f'No subscribers for issue {issue_id}.'

    logger.info(
        'send_newsletter_issue_task: Dispatching "%s" (ID %d) to %d subscribers.',
        issue.subject, issue.id, subscriber_count,
    )

    frontend_url = settings.FRONTEND_URL.rstrip('/')
    site_name = getattr(settings, 'APP_DISPLAY_NAME', 'Efiko')
    support_email = getattr(settings, 'SUPPORT_EMAIL', settings.DEFAULT_FROM_EMAIL)

    # Build a signature per subscriber — no DB query inside the loop,
    # all data was fetched via values_list() above.
    email_signatures = []
    for email, unsubscribe_token in subscribers:
        context = {
            'newsletter_subject': issue.subject,
            'newsletter_body_html': issue.html_content,
            # UUID token in the unsubscribe URL — never the raw email address
            'unsubscribe_url': f'{frontend_url}/newsletter/unsubscribe?token={unsubscribe_token}',
            'subscriber_email': email,
            'site_name': site_name,
            'frontend_base_url': frontend_url,
            'support_email': support_email,
            'current_year': timezone.now().year,
        }

        # Only pass a text template name if we have custom plain text content
        text_template = None
        if issue.plain_text_content:
            context['newsletter_body_plain'] = issue.plain_text_content
            text_template = 'notifications/emails/newsletter_plain_wrapper.txt'

        email_signatures.append(
            send_generic_email_task.s(
                subject=issue.subject,
                html_template_name='notifications/emails/newsletter.html',
                context=context,
                recipient_list=[email],
                text_template_name=text_template,
            )
        )

    # Dispatch all signatures as a single group to the broker
    if email_signatures:
        group(email_signatures).apply_async()
        logger.info(
            'send_newsletter_issue_task: "%s" dispatched as group to %d subscribers.',
            issue.subject, len(email_signatures),
        )

    issue.is_sent = True
    issue.sent_at = timezone.now()
    issue.save(update_fields=['is_sent', 'sent_at'])

    return f'Issue {issue_id} dispatched to {subscriber_count} subscribers.'


@shared_task(name='schedule_pending_newsletters_task')
def schedule_pending_newsletters_task():
    """
    Periodic Celery Beat task — checks for newsletter issues whose
    scheduled_send_time has passed and dispatches them.

    select_for_update() prevents double-dispatch if Beat fires twice in
    quick succession (e.g. during a worker restart).
    """
    from .models import NewsletterIssue

    now = timezone.now()

    with transaction.atomic():
        pending = NewsletterIssue.objects.select_for_update(skip_locked=True).filter(
            is_sent=False,
            scheduled_send_time__isnull=False,
            scheduled_send_time__lte=now,
        )
        count = pending.count()

        if count == 0:
            logger.info('schedule_pending_newsletters_task: No pending issues.')
            return 'No pending issues.'

        logger.info(
            'schedule_pending_newsletters_task: Found %d pending issue(s).', count
        )
        for issue in pending:
            send_newsletter_issue_task.delay(issue.id)
            logger.info(
                'schedule_pending_newsletters_task: Dispatched issue ID %d ("%s").',
                issue.id, issue.subject,
            )

    return f'Dispatched {count} pending newsletter issue(s).'