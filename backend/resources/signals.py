# resources/signals.py
#
# NOTE: with django-imagekit, thumbnails are generated on first access automatically.
# This signal's only remaining job is to INVALIDATE the imagekit cache when
# cover_image is replaced with a new file, so stale thumbnails aren't served.
#
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.db import transaction

from imagekit.cachefiles import LazyImageCacheFile

from .models import Resource

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Resource)
def track_cover_image_change(sender, instance, **kwargs):
    """
    Issue #8: store the old cover_image name on the instance before save
    so post_save can detect whether it actually changed.
    """
    if not instance.pk:
        instance._old_cover_image = None
        return
    try:
        old = Resource.objects.get(pk=instance.pk)
        instance._old_cover_image = old.cover_image.name if old.cover_image else None
    except Resource.DoesNotExist:
        instance._old_cover_image = None


@receiver(post_save, sender=Resource)
def invalidate_thumbnail_cache(sender, instance, created, **kwargs):
    """
    Issue #8: when cover_image is replaced, invalidate the imagekit cache
    for both thumbnail sizes so fresh thumbnails are generated on next request.
    Runs via transaction.on_commit so the new file is fully committed first.
    """
    new_cover = instance.cover_image.name if instance.cover_image else None
    old_cover = getattr(instance, '_old_cover_image', None)

    # Only invalidate if cover_image actually changed or was just added
    if new_cover and new_cover != old_cover:
        def _invalidate():
            try:
                for spec_name in ('thumbnail_card', 'thumbnail_hero'):
                    cache_file = LazyImageCacheFile(
                        f'resources:{spec_name}',
                        source=instance.cover_image,
                    )
                    cache_file.invalidate()
                logger.info(
                    f'Thumbnail cache invalidated for Resource: {instance.title}'
                )
            except Exception as e:
                # Non-critical — imagekit will regenerate on next request anyway
                logger.warning(
                    f'Could not invalidate thumbnail cache for Resource '
                    f'{instance.pk}: {e}'
                )

        transaction.on_commit(_invalidate)