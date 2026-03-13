# products/serializers.py
from rest_framework import serializers
from .models import Product, ProductCategory


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug']


class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list/search results.
    No digital_file URL — that's only exposed on detail for purchasers.
    """
    category = ProductCategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'product_type',
            'price', 'cover_image', 'thumbnail', 'is_featured',
            'stock', 'is_active',
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for the product detail page.
    digital_file is only included when the requesting user has a completed
    order for this product — that logic is handled in the view via
    get_serializer_context, not here.
    """
    category = ProductCategorySerializer(read_only=True)
    digital_file = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'category', 'product_type',
            'price', 'stock', 'cover_image', 'thumbnail',
            'digital_file', 'is_featured', 'is_active',
            'created_at', 'updated_at',
        ]

    def get_digital_file(self, obj):
        """
        Return the download URL only if the requesting user has a paid order
        for this product. Returns null otherwise so the frontend can show
        a 'Purchase to download' prompt.
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        if obj.product_type != 'digital':
            return None

        has_purchased = (
            obj.orderitem_set
            .filter(
                order__user=request.user,
                order__payment_status='paid',
            )
            .exists()
        )
        if has_purchased and obj.digital_file:
            return request.build_absolute_uri(obj.digital_file.url)
        return None