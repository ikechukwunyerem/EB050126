# blog/models.py
import re
from django.db import models, transaction
from django.utils.text import slugify
from django.conf import settings

from django_bleach.models import BleachField
from django.contrib.postgres.search import SearchVectorField, SearchVector
from django.contrib.postgres.indexes import GinIndex

# Issue #8: imagekit thumbnails — consistent with resources app
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFill


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

    # Issue #7: bleach config imported from settings — single source of truth.
    content = BleachField(
        allowed_tags=settings.BLOG_BLEACH_ALLOWED_TAGS,
        allowed_attributes=settings.BLOG_BLEACH_ALLOWED_ATTRIBUTES,
        strip_tags=False,
        strip_comments=True,
    )

    # Issue #13: auto-generated from content in save() when left blank.
    excerpt = models.TextField(
        blank=True,
        help_text=(
            'Short summary for search results and previews. '
            'Auto-generated from content if left blank.'
        ),
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    cover_image = models.ImageField(upload_to='blog/covers/', blank=True, null=True)

    # Issue #8: virtual imagekit fields — no DB columns, no migrations.
    # Generated on first request, cached automatically, cloud-storage safe.
    cover_thumbnail = ImageSpecField(
        source='cover_image',
        processors=[ResizeToFill(600, 315)],    # 16:9 card (OG image ratio)
        format='WEBP',
        options={'quality': 82},
    )
    cover_hero = ImageSpecField(
        source='cover_image',
        processors=[ResizeToFill(1200, 630)],   # 16:9 full-width hero
        format='WEBP',
        options={'quality': 85},
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            GinIndex(fields=['search_vector'], name='post_search_gin'),
        ]

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

        # Issue #13: auto-generate excerpt when blank
        if not self.excerpt and self.content:
            plain = _strip_html(self.content)
            self.excerpt = plain[:300] + ('…' if len(plain) > 300 else '')

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