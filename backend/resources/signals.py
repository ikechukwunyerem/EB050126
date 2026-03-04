# resources/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from .models import Resource
from .tasks import process_resource_thumbnail

@receiver(post_save, sender=Resource)
def trigger_thumbnail_processing(sender, instance, created, **kwargs):
    # Only process if there is a cover_image and no thumbnail exists yet
    if instance.cover_image and not instance.thumbnail:
        # transaction.on_commit ensures the database row is fully saved 
        # before the Celery worker tries to fetch it
        transaction.on_commit(lambda: process_resource_thumbnail.delay(instance.id))