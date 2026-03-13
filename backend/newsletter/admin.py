# newsletter/admin.py
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.urls import reverse
from django.utils.html import format_html

from .models import NewsletterSubscriber, NewsletterIssue
from .tasks import send_newsletter_issue_task


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ('email', 'user_link', 'is_active', 'subscribed_at', 'unsubscribed_at')
    list_filter = ('is_active', 'subscribed_at')
    search_fields = ('email', 'user__email')
    readonly_fields = ('subscribed_at', 'unsubscribed_at', 'unsubscribe_token')
    # Adopted from example: bulk activate/deactivate actions are useful
    actions = ['activate_subscribers', 'deactivate_subscribers']

    def user_link(self, obj):
        # Adopted from example: clickable admin link to the associated user
        if obj.user:
            link = reverse('admin:userauth_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', link, obj.user.email)
        return '—'
    user_link.short_description = _('Associated User')
    user_link.admin_order_field = 'user'

    @admin.action(description=_('Activate selected subscribers'))
    def activate_subscribers(self, request, queryset):
        updated = queryset.filter(is_active=False).update(
            is_active=True,
            unsubscribed_at=None,
        )
        self.message_user(request, _(f'{updated} subscriber(s) activated.'))

    @admin.action(description=_('Deactivate selected subscribers'))
    def deactivate_subscribers(self, request, queryset):
        updated = queryset.filter(is_active=True).update(
            is_active=False,
            unsubscribed_at=timezone.now(),
        )
        self.message_user(request, _(f'{updated} subscriber(s) deactivated.'))


@admin.register(NewsletterIssue)
class NewsletterIssueAdmin(admin.ModelAdmin):
    list_display = (
        'subject',
        'scheduled_send_time_display',
        'is_sent',
        'sent_at_display',
        'created_at',
    )
    list_filter = ('is_sent', 'scheduled_send_time', 'created_at')
    search_fields = ('subject',)
    readonly_fields = ('is_sent', 'sent_at', 'created_at')
    # mark_as_sent / mark_as_not_sent deliberately excluded — see admin.py review notes.
    # Use send_selected_issues_now to trigger a send, and let the task own is_sent/sent_at.
    actions = ['send_selected_issues_now']
    fieldsets = (
        (None, {
            'fields': ('subject',),
        }),
        (_('Content'), {
            'description': _(
                'You may use template variables in the HTML body: '
                '{{ subscriber_email }}, {{ unsubscribe_url }}, '
                '{{ site_name }}, {{ current_year }}.'
            ),
            'fields': ('html_content', 'plain_text_content'),
        }),
        (_('Scheduling & Status'), {
            'fields': ('scheduled_send_time', 'is_sent', 'sent_at'),
        }),
        (_('Metadata'), {
            'fields': ('created_at',),
            'classes': ('collapse',),
        }),
    )

    # --- Display helpers ---

    def scheduled_send_time_display(self, obj):
        if obj.scheduled_send_time:
            return obj.scheduled_send_time.strftime('%Y-%m-%d %H:%M %Z')
        return _('Not scheduled')
    scheduled_send_time_display.short_description = _('Scheduled Send Time')
    scheduled_send_time_display.admin_order_field = 'scheduled_send_time'

    def sent_at_display(self, obj):
        if obj.sent_at:
            return obj.sent_at.strftime('%Y-%m-%d %H:%M %Z')
        return _('Not sent yet')
    sent_at_display.short_description = _('Sent At')
    sent_at_display.admin_order_field = 'sent_at'

    # --- Actions ---

    @admin.action(description=_('Send selected issues NOW (ignores schedule)'))
    def send_selected_issues_now(self, request, queryset):
        """
        Adopted from example. Dispatches the Celery task directly without
        touching is_sent — the task owns that state transition.
        """
        dispatched = 0
        for issue in queryset:
            if issue.is_sent:
                self.message_user(
                    request,
                    _(f'Issue "{issue.subject}" was already sent and was skipped.'),
                    level='WARNING',
                )
            else:
                send_newsletter_issue_task.delay(issue.id)
                dispatched += 1

        if dispatched:
            self.message_user(
                request,
                _(
                    f'{dispatched} issue(s) queued for immediate dispatch. '
                    f'Check Celery worker logs for progress.'
                ),
            )