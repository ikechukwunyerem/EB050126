# search/apps.py
from django.apps import AppConfig


class SearchConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'search'

    def ready(self):
        # No signals needed — SearchLog writes are handled by Celery tasks.
        pass