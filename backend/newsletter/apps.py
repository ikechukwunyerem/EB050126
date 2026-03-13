# newsletter/apps.py
from django.apps import AppConfig


class NewsletterConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'newsletter'

    def ready(self):
        # Wire up the auto-subscribe signal:
        # when a new user verifies their email, they are automatically
        # added as a newsletter subscriber (is_active=True).
        # The signal receiver lives in newsletter/signals.py.
        import newsletter.signals  # noqa: F401