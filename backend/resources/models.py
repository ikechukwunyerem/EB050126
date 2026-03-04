# resources/models.py
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils.text import slugify

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name=_("Category Name"))
    slug = models.SlugField(max_length=110, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

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

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
            original_slug = self.slug
            counter = 1
            while Resource.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

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