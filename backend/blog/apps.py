# blog/apps.py
from django.apps import AppConfig


class BlogConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'blog'

    def ready(self):
        # Issue #10: ready() hook in place for future signal connections
        # e.g. cache invalidation on publish, search index updates, notifications.
        # Uncomment when blog/signals.py is created:
        # import blog.signals  # noqa: F401
        pass