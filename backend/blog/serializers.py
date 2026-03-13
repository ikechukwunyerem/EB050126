# blog/serializers.py
from rest_framework import serializers
from .models import Post


class PostListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views.

    Issue #5: full `content` omitted — only excerpt is returned.
    Issue #6: `status` omitted — view already filters to published only.
    Issue #1: author_name falls back to email; handles NULL author gracefully.
    Issue #14: cover_image returns null instead of "" when blank.
    """
    author_name = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    cover_thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'title', 'slug',
            'author_name',
            'excerpt',
            'cover_image', 'cover_thumbnail',
            'created_at',
        ]

    def get_author_name(self, obj):
        # Issue #1: author is nullable (SET_NULL). full_name falls back to email.
        if not obj.author:
            return None
        return obj.author.full_name or obj.author.email

    def get_cover_image(self, obj):
        # Issue #14: null instead of "" when no image is set
        if not obj.cover_image:
            return None
        request = self.context.get('request')
        url = obj.cover_image.url
        return request.build_absolute_uri(url) if request else url

    def get_cover_thumbnail(self, obj):
        # Issue #8: card-sized 600×315 WEBP thumbnail via imagekit
        if not obj.cover_image:
            return None
        try:
            request = self.context.get('request')
            url = obj.cover_thumbnail.url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None


class PostDetailSerializer(PostListSerializer):
    """
    Full serializer for the detail/retrieve view.

    Issue #5: adds full `content` and `cover_hero`.
    Issue #11: adds `updated_at`.
    """
    cover_hero = serializers.SerializerMethodField()

    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + [
            'content', 'cover_hero', 'updated_at',
        ]

    def get_cover_hero(self, obj):
        # Issue #8: full-width 1200×630 WEBP hero image via imagekit
        if not obj.cover_image:
            return None
        try:
            request = self.context.get('request')
            url = obj.cover_hero.url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None