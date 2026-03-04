# resources/apps.py
from django.apps import AppConfig

class ResourcesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'resources'

    def ready(self):
        # Import the signals when the app starts
        import resources.signals