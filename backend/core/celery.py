# core/celery.py
"""
Celery application entry point for the Efiko project.

Worker:  celery -A core worker -l info
Beat:    celery -A core beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

Or run both together in development (NOT for production):
         celery -A core worker --beat -l info
"""
import os
from celery import Celery

# Tell Celery which Django settings module to use before anything else
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('efiko')

# Load configuration from Django settings using the CELERY_ namespace.
# Any setting prefixed CELERY_ in settings.py is automatically picked up.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all INSTALLED_APPS.
# Each app just needs a tasks.py file — no manual registration needed.
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """
    Utility task for verifying the worker is running.
    Usage: from core.celery import debug_task; debug_task.delay()
    """
    print(f'Request: {self.request!r}')