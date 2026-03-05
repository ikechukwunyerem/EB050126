# blog/models.py
from django.db import models
from django.utils.text import slugify
from django.conf import settings

# PostgreSQL FTS Imports
from django.contrib.postgres.search import SearchVectorField, SearchVector
from django.contrib.postgres.indexes import GinIndex

class Post(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='blog_posts')
    content = models.TextField()
    excerpt = models.TextField(blank=True, help_text="A short summary for search results and previews.")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    cover_image = models.ImageField(upload_to='blog/covers/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --- PostgreSQL Full-Text Search Field ---
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        # --- GIN Index ---
        indexes = [
            GinIndex(fields=['search_vector'], name='post_search_gin'),
        ]

    def save(self, *args, **kwargs):
        # 1. Handle slug generation
        if not self.slug:
            self.slug = slugify(self.title)
            original_slug = self.slug
            counter = 1
            while Post.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
                
        # 2. Save the instance first
        super().save(*args, **kwargs)
        
        # 3. Calculate and apply the Search Vector weights (A, B, and C tiers)
        Post.objects.filter(pk=self.pk).update(
            search_vector=(
                SearchVector('title', weight='A') + 
                SearchVector('excerpt', weight='B') +
                SearchVector('content', weight='C')
            )
        )

    def __str__(self):
        return self.title