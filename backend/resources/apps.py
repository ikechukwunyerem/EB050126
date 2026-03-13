# resources/apps.py
from django.apps import AppConfig


class ResourcesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'resources'

    def ready(self):
        # Issue #3: import signals here so Django connects the receivers on startup.
        # Without this, the post_save signal for thumbnail processing never fires.
        import resources.signals  # noqa: F401