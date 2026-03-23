# blog/serializers.py
from rest_framework import serializers
from .models import Post


class PostListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views.

    Full `content` omitted — only excerpt is returned.
    `status` omitted — view already filters to published only.
    author_name falls back to email; handles NULL author gracefully.
    cover_image and cover_thumbnail return null instead of "" when blank.
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
        # author is nullable (SET_NULL). full_name falls back to email.
        if not obj.author:
            return None
        return obj.author.full_name or obj.author.email

    def get_cover_image(self, obj):
        if not obj.cover_image:
            return None
        request = self.context.get('request')
        url = obj.cover_image.url
        return request.build_absolute_uri(url) if request else url

    def get_cover_thumbnail(self, obj):
        if not obj.cover_thumbnail:
            return None
        request = self.context.get('request')
        url = obj.cover_thumbnail.url
        return request.build_absolute_uri(url) if request else url


class PostDetailSerializer(PostListSerializer):
    """
    Full serializer for the detail/retrieve view.
    Adds full `content` and `updated_at`.
    """

    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + [
            'content', 'updated_at',
        ]