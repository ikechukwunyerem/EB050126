# products/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils.text import slugify

class ProductCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True)

    class Meta:
        verbose_name_plural = "Product Categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Product(models.Model):
    PRODUCT_TYPES = [
        ('physical', 'Physical Product'),
        ('digital', 'Digital Product'),
    ]
    
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(ProductCategory, on_delete=models.SET_NULL, null=True, related_name='products')
    
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPES, default='physical')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Inventory & Delivery
    stock = models.PositiveIntegerField(default=0, help_text=_("For physical products only"))
    digital_file = models.FileField(upload_to='products/digital_files/', blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    
    # Assets for background processing later
    cover_image = models.ImageField(upload_to='products/covers/originals/', blank=True, null=True)
    thumbnail = models.ImageField(upload_to='products/covers/thumbnails/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
            original_slug = self.slug
            counter = 1
            while Product.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name