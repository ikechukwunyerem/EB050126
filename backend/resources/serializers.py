# resources/serializers.py
from rest_framework import serializers
from .models import Category, Resource, SavedResource, HeroSlide


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class CategorySerializer(serializers.ModelSerializer):
    """
    Issue #4: includes recursive children so the frontend can render a full
    nested category tree rather than a flat unstructured list.
    """
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'parent', 'children']

    def get_children(self, obj):
        # get_children() is provided by MPTT — returns direct children only
        qs = obj.get_children()
        return CategorySerializer(qs, many=True, context=self.context).data


# ---------------------------------------------------------------------------
# Resource
# ---------------------------------------------------------------------------

class ResourceListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views — returns card-sized thumbnail,
    no file URL (access control enforced in ResourceDetailSerializer).

    Issue #9: exposes is_free and is_featured.
    Issue #5: file field intentionally omitted from list responses.
    """
    category = CategorySerializer(read_only=True)
    is_free = serializers.BooleanField(read_only=True)

    # Issue #2 / Option B: imagekit generates these on first access from cover_image.
    # SerializerMethodField builds absolute URLs safely regardless of storage backend.
    thumbnail_card = serializers.SerializerMethodField()
    thumbnail_hero = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = [
            'id', 'title', 'slug', 'description',
            'category', 'resource_type', 'access_level', 'is_free',
            'status', 'is_featured',
            'cover_image', 'thumbnail_card', 'thumbnail_hero',
            'created_at',
        ]

    def get_thumbnail_card(self, obj):
        if not obj.cover_image:
            return None
        try:
            request = self.context.get('request')
            url = obj.thumbnail_card.url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None

    def get_thumbnail_hero(self, obj):
        if not obj.cover_image:
            return None
        try:
            request = self.context.get('request')
            url = obj.thumbnail_hero.url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None


class ResourceDetailSerializer(ResourceListSerializer):
    """
    Full serializer for detail views.

    Issue #1 / #5: the `file` field is conditionally included based on
    the user's entitlement:
      - Free resources: authenticated users only
      - Subscriber resources: active subscribers only
    Unauthenticated or non-subscribed users receive null for `file`.
    """
    file = serializers.SerializerMethodField()

    class Meta(ResourceListSerializer.Meta):
        fields = ResourceListSerializer.Meta.fields + ['file', 'updated_at']

    def get_file(self, obj):
        request = self.context.get('request')
        if not request:
            return None

        user = request.user

        # Free resources — any authenticated user can download
        if obj.is_free:
            if not user.is_authenticated:
                return None
            return request.build_absolute_uri(obj.file.url) if obj.file else None

        # Subscriber-only resources — check active subscription
        if not user.is_authenticated:
            return None

        if self._user_has_active_subscription(user):
            return request.build_absolute_uri(obj.file.url) if obj.file else None

        return None

    @staticmethod
    def _user_has_active_subscription(user):
        """
        Checks the user's current subscription using the is_valid property
        defined on UserSubscription. Catches DoesNotExist gracefully.
        """
        try:
            sub = user.subscriptions.get(is_current=True)
            return sub.is_valid
        except Exception:
            return False


# ---------------------------------------------------------------------------
# SavedResource  (Issue #11 / #14: bookmark feature now has an API serializer)
# ---------------------------------------------------------------------------

class SavedResourceSerializer(serializers.ModelSerializer):
    """
    Used for the bookmark endpoints — POST to save, DELETE to unsave.
    Returns the lightweight resource representation alongside save metadata.
    """
    resource = ResourceListSerializer(read_only=True)
    resource_id = serializers.PrimaryKeyRelatedField(
        queryset=Resource.objects.filter(status='published'),
        source='resource',
        write_only=True,
    )

    class Meta:
        model = SavedResource
        fields = ['id', 'resource', 'resource_id', 'saved_at']
        read_only_fields = ['id', 'saved_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        # unique_together on the model prevents duplicates — surface a clean error
        from django.db import IntegrityError
        try:
            return super().create(validated_data)
        except IntegrityError:
            raise serializers.ValidationError(
                {'resource_id': 'You have already saved this resource.'}
            )


# ---------------------------------------------------------------------------
# HeroSlide
# ---------------------------------------------------------------------------

class HeroSlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSlide
        fields = ['id', 'title', 'subtitle', 'image', 'link', 'btn_text']