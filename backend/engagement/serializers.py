# engagement/serializers.py
from django.utils import timezone
from rest_framework import serializers

from .models import Comment, Rating, EngagementSummary, MAX_COMMENT_DEPTH


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------

class CommentReplySerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for nested replies — no further nesting.
    Keeps response size predictable and avoids recursive depth explosions.
    """
    author_name = serializers.SerializerMethodField()
    content = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'author_name', 'content', 'is_deleted',
            'depth', 'created_at', 'edited_at',
        ]

    def get_author_name(self, obj):
        # Issue #14: use user.full_name for consistency with rest of project
        if obj.is_deleted:
            return None
        return obj.user.full_name or obj.user.email

    def get_content(self, obj):
        # Issue #9: hide content of soft-deleted comments
        return '[deleted]' if obj.is_deleted else obj.content


class CommentSerializer(serializers.ModelSerializer):
    """
    Full comment serializer with nested replies for top-level comments.
    Issue #5: top-level comments include their replies nested under `replies`.
    """
    author_name = serializers.SerializerMethodField()
    content = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    # Issue #8: enforce content length bounds
    content_input = serializers.CharField(
        min_length=1,
        max_length=2000,
        write_only=True,
        source='content',
    )

    class Meta:
        model = Comment
        fields = [
            'id', 'target_type', 'target_id', 'parent',
            'depth', 'author_name',
            'content', 'content_input',
            'is_deleted', 'replies',
            'created_at', 'edited_at',
        ]
        read_only_fields = [
            'target_type', 'target_id', 'is_deleted',
            'depth', 'created_at', 'edited_at',
        ]

    def get_author_name(self, obj):
        if obj.is_deleted:
            return None
        # Issue #14: use model's full_name property
        return obj.user.full_name or obj.user.email

    def get_content(self, obj):
        # Issue #9: mask content of soft-deleted comments
        return '[deleted]' if obj.is_deleted else obj.content

    def get_replies(self, obj):
        # Only fetch replies for top-level comments (depth=0)
        if obj.depth > 0:
            return []
        replies = (
            obj.replies
            .select_related('user')
            .filter(parent=obj)
            .order_by('created_at')
        )
        return CommentReplySerializer(replies, many=True, context=self.context).data

    def validate_parent(self, parent):
        # Issue #18: enforce max threading depth
        if parent and parent.depth >= MAX_COMMENT_DEPTH:
            raise serializers.ValidationError(
                f'Maximum comment depth of {MAX_COMMENT_DEPTH} reached.'
            )
        return parent

    def validate(self, attrs):
        # Issue #1: ensure parent belongs to the same target
        # target_type/target_id come from the view via perform_create, not attrs
        # so we validate here using context if provided
        parent = attrs.get('parent')
        if parent:
            request = self.context.get('request')
            target_type = self.context.get('target_type')
            target_id = self.context.get('target_id')
            if target_type and parent.target_type != target_type:
                raise serializers.ValidationError(
                    {'parent': 'Reply must belong to the same target.'}
                )
            if target_id and parent.target_id != int(target_id):
                raise serializers.ValidationError(
                    {'parent': 'Reply must belong to the same target.'}
                )
        return attrs


class CommentUpdateSerializer(serializers.ModelSerializer):
    """
    Used for PATCH — only content is editable. Sets edited_at automatically.
    Issue #10: supports editing a comment.
    """
    content = serializers.CharField(min_length=1, max_length=2000)

    class Meta:
        model = Comment
        fields = ['content']

    def update(self, instance, validated_data):
        instance.content = validated_data['content']
        instance.edited_at = timezone.now()
        instance.save(update_fields=['content', 'edited_at'])
        return instance


# ---------------------------------------------------------------------------
# Rating
# ---------------------------------------------------------------------------

class RatingSerializer(serializers.ModelSerializer):
    """
    Issue #11: serializer for submitting or updating a rating.
    """
    class Meta:
        model = Rating
        fields = ['id', 'target_type', 'target_id', 'score', 'created_at', 'updated_at']
        read_only_fields = ['id', 'target_type', 'target_id', 'created_at', 'updated_at']


# ---------------------------------------------------------------------------
# EngagementSummary
# ---------------------------------------------------------------------------

class EngagementSummarySerializer(serializers.ModelSerializer):
    """
    Issue #16: read-only serializer for the summary endpoint.
    """
    class Meta:
        model = EngagementSummary
        fields = [
            'target_type', 'target_id',
            'avg_rating', 'rating_count',
            'star_1', 'star_2', 'star_3', 'star_4', 'star_5',
            'comment_count', 'updated_at',
        ]