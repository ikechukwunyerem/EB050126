# resources/tasks.py
import logging
from io import BytesIO
from PIL import Image, ImageOps
from django.core.files.base import ContentFile
from celery import shared_task
from .models import Resource

logger = logging.getLogger(__name__)

@shared_task
def process_resource_thumbnail(resource_id):
    """Background task to generate WEBP thumbnails from uploaded cover images."""
    try:
        resource = Resource.objects.get(id=resource_id)
        if not resource.cover_image:
            return "No cover image to process."

        # FIX: Use .path to get the absolute file location in the media directory
        img = Image.open(resource.cover_image.path)
        
        # Convert to RGB (in case of PNG with transparency)
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Resize and crop to exact dimensions (300x157)
        img = ImageOps.fit(img, (300, 157), Image.Resampling.LANCZOS)

        # Save to memory in WEBP format
        temp_thumb = BytesIO()
        img.save(temp_thumb, format='WEBP', quality=80)
        temp_thumb.seek(0)

        # Generate filename
        file_name = f"thumb_{resource.slug}.webp"
        
        # Attach the new file to the model
        resource.thumbnail.save(file_name, ContentFile(temp_thumb.read()), save=False)
        
        # Use .update() instead of .save() to prevent triggering Django signals again
        Resource.objects.filter(id=resource_id).update(thumbnail=resource.thumbnail)
        
        logger.info(f"Successfully generated thumbnail for Resource: {resource.title}")
        return True

    except Exception as e:
        logger.error(f"Thumbnail processing failed for Resource {resource_id}: {str(e)}")
        return False