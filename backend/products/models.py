# products/models.py
from django.db import models, transaction
from django.utils.translation import gettext_lazy as _
from django.utils.text import slugify

# PostgreSQL FTS Imports
from django.contrib.postgres.search import SearchVectorField, SearchVector
from django.contrib.postgres.indexes import GinIndex


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

    cover_image = models.ImageField(upload_to='products/covers/originals/', blank=True, null=True)
    thumbnail = models.ImageField(upload_to='products/covers/thumbnails/', blank=True, null=True)

    is_featured = models.BooleanField(
        default=False,
        help_text="Check this box to showcase this product on the homepage."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --- PostgreSQL Full-Text Search Field ---
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        indexes = [
            GinIndex(fields=['search_vector'], name='product_search_gin'),
        ]

    def save(self, *args, **kwargs):
        # FIX #2: Same race-condition fix as resources — slug generation is wrapped
        # in select_for_update() inside an atomic transaction.
        if not self.slug:
            base_slug = slugify(self.name)
            with transaction.atomic():
                slug = base_slug
                counter = 1
                while True:
                    if not Product.objects.filter(slug=slug).select_for_update().exists():
                        self.slug = slug
                        break
                    slug = f"{base_slug}-{counter}"
                    counter += 1

        super().save(*args, **kwargs)

        # Update search vector after save
        Product.objects.filter(pk=self.pk).update(
            search_vector=(
                SearchVector('name', weight='A') +
                SearchVector('description', weight='B')
            )
        )

    def __str__(self):
        return self.name