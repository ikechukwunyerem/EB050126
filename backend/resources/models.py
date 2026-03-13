# resources/models.py
from django.db import models, transaction
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils.text import slugify

# MPTT for hierarchical categories
from mptt.models import MPTTModel, TreeForeignKey

# PostgreSQL FTS
from django.contrib.postgres.search import SearchVectorField, SearchVector
from django.contrib.postgres.indexes import GinIndex

# Option B: django-imagekit replaces the thumbnail ImageField entirely.
# ImageSpecField is a virtual field — no migration needed when adding new sizes.
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFill


class Category(MPTTModel):
    name = models.CharField(max_length=100, unique=True, verbose_name=_('Category Name'))
    slug = models.SlugField(max_length=110, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)

    parent = TreeForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        db_index=True,
    )

    class MPTTMeta:
        order_insertion_by = ['name']

    class Meta:
        verbose_name_plural = 'Categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        full_path = [self.name]
        k = self.parent
        while k is not None:
            full_path.append(k.name)
            k = k.parent
        return ' > '.join(full_path[::-1])


class Resource(models.Model):
    RESOURCE_TYPES = [
        ('worksheet', 'Worksheet'),
        ('lesson_plan', 'Lesson Plan'),
        ('presentation', 'Presentation'),
        ('interactive', 'Interactive Media'),
    ]
    ACCESS_LEVELS = [
        ('free', 'Free (Login Required)'),
        ('subscriber', 'Subscriber Only'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(blank=True)

    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name='resources', null=True
    )
    resource_type = models.CharField(max_length=50, choices=RESOURCE_TYPES, default='worksheet')
    access_level = models.CharField(max_length=20, choices=ACCESS_LEVELS, default='subscriber')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    file = models.FileField(upload_to='resources/files/')
    cover_image = models.ImageField(
        upload_to='resources/covers/originals/', blank=True, null=True
    )

    # Virtual fields — derived from cover_image, no DB column, no migration.
    # Generated on first request, cached automatically, works with cloud storage.
    # Add new sizes here freely with zero DB impact.
    thumbnail_card = ImageSpecField(
        source='cover_image',
        processors=[ResizeToFill(300, 157)],    # 16:9 card thumbnail
        format='WEBP',
        options={'quality': 80},
    )
    thumbnail_hero = ImageSpecField(
        source='cover_image',
        processors=[ResizeToFill(800, 450)],    # 16:9 hero / featured banner
        format='WEBP',
        options={'quality': 85},
    )

    is_featured = models.BooleanField(
        default=False,
        help_text='Check this box to showcase this resource on the homepage.',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_free(self):
        """Derived from access_level — single source of truth."""
        return self.access_level == 'free'

    # PostgreSQL Full-Text Search
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        indexes = [
            GinIndex(fields=['search_vector'], name='resource_search_gin'),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            with transaction.atomic():
                slug = base_slug
                counter = 1
                while True:
                    if not Resource.objects.filter(slug=slug).select_for_update().exists():
                        self.slug = slug
                        break
                    slug = f'{base_slug}-{counter}'
                    counter += 1

        super().save(*args, **kwargs)

        Resource.objects.filter(pk=self.pk).update(
            search_vector=(
                SearchVector('title', weight='A') +
                SearchVector('description', weight='B')
            )
        )

    def __str__(self):
        return self.title


class SavedResource(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_resource_entries',
    )
    resource = models.ForeignKey(
        Resource, on_delete=models.CASCADE, related_name='saved_by_users'
    )
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'resource')
        ordering = ['-saved_at']

    def __str__(self):
        return f'{self.user.email} saved {self.resource.title}'


class HeroSlide(models.Model):
    title = models.CharField(max_length=200, help_text='Main headline for the slide.')
    subtitle = models.CharField(max_length=300, blank=True, help_text='Subtext below the headline.')
    image = models.ImageField(upload_to='hero_slides/', help_text='High-resolution background image.')
    link = models.CharField(max_length=200, default='/library', help_text='Where the CTA button links to.')
    btn_text = models.CharField(max_length=50, default='Explore Now', help_text='Button label.')
    is_active = models.BooleanField(default=True, help_text='Uncheck to hide from homepage.')
    display_order = models.PositiveIntegerField(default=0, help_text='Lower numbers appear first.')

    class Meta:
        ordering = ['display_order']
        verbose_name = 'Hero Slide'
        verbose_name_plural = 'Hero Slides'

    def __str__(self):
        return self.title