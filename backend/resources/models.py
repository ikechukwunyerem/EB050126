# resources/models.py
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils.text import slugify

# MPTT Imports for Hierarchical Taxonomy
from mptt.models import MPTTModel, TreeForeignKey

# PostgreSQL FTS Imports
from django.contrib.postgres.search import SearchVectorField, SearchVector
from django.contrib.postgres.indexes import GinIndex

class Category(MPTTModel):
    name = models.CharField(max_length=100, unique=True, verbose_name=_("Category Name"))
    slug = models.SlugField(max_length=110, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    
    # MPTT Hierarchy Field
    parent = TreeForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='children',
        db_index=True
    )

    class MPTTMeta:
        order_insertion_by = ['name']

    class Meta:
        verbose_name_plural = "Categories"

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
    
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='resources', null=True)
    resource_type = models.CharField(max_length=50, choices=RESOURCE_TYPES, default='worksheet')
    access_level = models.CharField(max_length=20, choices=ACCESS_LEVELS, default='subscriber')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Asset Files
    file = models.FileField(upload_to='resources/files/')
    
    # Image fields for background processing later
    cover_image = models.ImageField(upload_to='resources/covers/originals/', blank=True, null=True)
    thumbnail = models.ImageField(
        upload_to='resources/covers/thumbnails/', 
        blank=True, 
        null=True, 
        help_text=_("Generated automatically by background task.")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --- PostgreSQL Full-Text Search Field ---
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        # --- GIN Index for blazing fast search queries ---
        indexes = [
            GinIndex(fields=['search_vector'], name='resource_search_gin'),
        ]

    def save(self, *args, **kwargs):
        # 1. Handle slug generation
        if not self.slug:
            self.slug = slugify(self.title)
            original_slug = self.slug
            counter = 1
            while Resource.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
                
        # 2. Save the instance first so it possesses a primary key in the DB
        super().save(*args, **kwargs)
        
        # 3. Calculate and apply the Search Vector weights (A for title, B for description)
        Resource.objects.filter(pk=self.pk).update(
            search_vector=(
                SearchVector('title', weight='A') + 
                SearchVector('description', weight='B')
            )
        )

    def __str__(self):
        return self.title

class SavedResource(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_resources')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='saved_by_users')
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'resource')
        ordering = ['-saved_at']

    def __str__(self):
        return f"{self.user.email} saved {self.resource.title}"