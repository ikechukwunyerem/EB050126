# blog/models.py
import io
import re
from django.db import models, transaction
from django.utils.text import slugify
from django.conf import settings
from django.core.files.base import ContentFile

from django_bleach.models import BleachField
from django.contrib.postgres.search import SearchVectorField, SearchVector
from django.contrib.postgres.indexes import GinIndex

from PIL import Image


def _strip_html(html):
    """Strips HTML tags to produce plain text for excerpt auto-generation."""
    return re.sub(r'<[^>]+>', '', html or '').strip()


class Post(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='blog_posts',
    )

    content = BleachField(
        allowed_tags=settings.BLOG_BLEACH_ALLOWED_TAGS,
        allowed_attributes=settings.BLOG_BLEACH_ALLOWED_ATTRIBUTES,
        strip_tags=False,
        strip_comments=True,
    )

    # Auto-generated from content in save() when left blank.
    excerpt = models.TextField(
        blank=True,
        help_text=(
            'Short summary for search results and previews. '
            'Auto-generated from content if left blank.'
        ),
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    cover_image = models.ImageField(upload_to='blog/covers/originals/', blank=True, null=True)
    cover_thumbnail = models.ImageField(upload_to='blog/covers/thumbnails/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            GinIndex(fields=['search_vector'], name='post_search_gin'),
        ]

    def _generate_thumbnail(self):
        """
        Crop and resize cover_image to 400×300 in memory using Pillow and
        save the result directly to cover_thumbnail. Never writes to local disk.
        """
        img = Image.open(self.cover_image)
        img = img.convert('RGB')

        src_w, src_h = img.size
        target_ratio = 400 / 300
        src_ratio = src_w / src_h

        if src_ratio > target_ratio:
            new_w = int(src_h * target_ratio)
            offset = (src_w - new_w) // 2
            img = img.crop((offset, 0, offset + new_w, src_h))
        else:
            new_h = int(src_w / target_ratio)
            offset = (src_h - new_h) // 2
            img = img.crop((0, offset, src_w, offset + new_h))

        img = img.resize((400, 300), Image.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85, optimize=True)
        buffer.seek(0)

        original_name = self.cover_image.name.split('/')[-1]
        base_name = original_name.rsplit('.', 1)[0]
        thumb_name = f'{base_name}_thumb.jpg'

        self.cover_thumbnail.save(thumb_name, ContentFile(buffer.read()), save=False)

    def _resize_cover_image(self):
        """
        Resize cover_image down to a max width of 1200px in memory.
        Overwrites the field content without changing the file name or path.
        """
        img = Image.open(self.cover_image)
        img = img.convert('RGB')

        max_width = 1200
        if img.width > max_width:
            ratio = max_width / img.width
            new_size = (max_width, int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85, optimize=True)
        buffer.seek(0)

        original_name = self.cover_image.name.split('/')[-1]
        self.cover_image.save(original_name, ContentFile(buffer.read()), save=False)

    def save(self, *args, **kwargs):
        # Race-condition-safe slug generation
        if not self.slug:
            base_slug = slugify(self.title)
            with transaction.atomic():
                slug = base_slug
                counter = 1
                while True:
                    if not Post.objects.filter(slug=slug).select_for_update().exists():
                        self.slug = slug
                        break
                    slug = f'{base_slug}-{counter}'
                    counter += 1

        # Auto-generate excerpt when blank
        if not self.excerpt and self.content:
            plain = _strip_html(self.content)
            self.excerpt = plain[:300] + ('…' if len(plain) > 300 else '')

        # ---- Image processing ----
        cover_changed = False
        if self.cover_image:
            if self.pk:
                try:
                    old = Post.objects.get(pk=self.pk)
                    cover_changed = old.cover_image.name != self.cover_image.name
                except Post.DoesNotExist:
                    cover_changed = True
            else:
                cover_changed = True  # New instance

        if cover_changed and self.cover_image:
            self._resize_cover_image()
            self._generate_thumbnail()

        super().save(*args, **kwargs)

        # Update FTS search vector after every save
        Post.objects.filter(pk=self.pk).update(
            search_vector=(
                SearchVector('title', weight='A') +
                SearchVector('excerpt', weight='B') +
                SearchVector('content', weight='C')
            )
        )

    def __str__(self):
        return self.title