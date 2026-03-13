# engagement/views.py
import logging
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from core.pagination import StandardResultsSetPagination
from .models import Comment, Rating, EngagementSummary, VALID_TARGET_TYPES
from .serializers import (
    CommentSerializer,
    CommentUpdateSerializer,
    RatingSerializer,
    EngagementSummarySerializer,
)

logger = logging.getLogger(__name__)


def validate_target_type(target_type):
    """
    Issue #1: central guard used by all views to reject unknown target_type values
    before they reach the ORM and create garbage data.
    """
    if target_type not in VALID_TARGET_TYPES:
        raise ValidationError(
            {'target_type': f'Invalid target type "{target_type}". '
                            f'Must be one of: {", ".join(sorted(VALID_TARGET_TYPES))}.'}
        )


# ---------------------------------------------------------------------------
# Comments — list + create
# ---------------------------------------------------------------------------

class TargetCommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /engagement/{target_type}/{target_id}/comments/ — paginated top-level comments
    POST /engagement/{target_type}/{target_id}/comments/ — post a new comment
    """
    serializer_class = CommentSerializer
    pagination_class = StandardResultsSetPagination  # Issue #7

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        target_type = self.kwargs['target_type']
        target_id = self.kwargs['target_id']

        # Issue #1: validate target_type before hitting the DB
        validate_target_type(target_type)

        # Issue #5: return only top-level comments (parent=None);
        # replies are nested inside each comment via the serializer.
        # Issue #6: select_related('user') prevents N+1 on author_name.
        return (
            Comment.objects
            .filter(
                target_type=target_type,
                target_id=target_id,
                parent__isnull=True,   # top-level only
            )
            .select_related('user')
            .prefetch_related('replies__user')  # prefetch one level of replies
            .order_by('-created_at')
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['target_type'] = self.kwargs['target_type']
        context['target_id'] = self.kwargs['target_id']
        return context

    def perform_create(self, serializer):
        target_type = self.kwargs['target_type']
        target_id = self.kwargs['target_id']

        # Issue #1: re-validate on create path too
        validate_target_type(target_type)

        serializer.save(
            user=self.request.user,
            target_type=target_type,
            target_id=target_id,
        )
        logger.info(
            'Comment created by %s on %s/%s',
            self.request.user.email, target_type, target_id,
        )


# ---------------------------------------------------------------------------
# Comments — retrieve + edit + soft-delete
# ---------------------------------------------------------------------------

class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /engagement/comments/{id}/  — retrieve a single comment
    PATCH  /engagement/comments/{id}/  — edit comment content (owner only)
    DELETE /engagement/comments/{id}/  — soft-delete (owner or staff only)

    Issue #10: edit and soft-delete endpoints.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Comment.objects.select_related('user')

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return CommentUpdateSerializer
        return CommentSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        obj = self.get_object()
        context['target_type'] = obj.target_type
        context['target_id'] = obj.target_id
        return context

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # Only the owner or staff can edit/delete
        if request.method in ('PATCH', 'DELETE'):
            if not (request.user == obj.user or request.user.is_staff):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You do not have permission to modify this comment.')

    def perform_update(self, serializer):
        serializer.save()
        logger.info('Comment %s edited by %s', self.get_object().pk, self.request.user.email)

    def perform_destroy(self, instance):
        # Issue #10: soft-delete — preserve thread structure, mask content
        instance.is_deleted = True
        instance.content = ''   # clear content to avoid leaking on direct DB access
        instance.save(update_fields=['is_deleted', 'content'])
        logger.info('Comment %s soft-deleted by %s', instance.pk, self.request.user.email)


# ---------------------------------------------------------------------------
# Ratings — submit or update
# ---------------------------------------------------------------------------

class SubmitRatingView(APIView):
    """
    POST /engagement/{target_type}/{target_id}/rate/

    Issue #11: creates or updates the authenticated user's rating for a target.
    Uses update_or_create so re-rating just updates the score.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, target_type, target_id):
        validate_target_type(target_type)  # Issue #1

        score = request.data.get('score')
        if score is None:
            return Response(
                {'error': 'score is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            score = int(score)
            if not (1 <= score <= 5):
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {'error': 'score must be an integer between 1 and 5.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rating, created = Rating.objects.update_or_create(
            user=request.user,
            target_type=target_type,
            target_id=target_id,
            defaults={'score': score},
        )

        logger.info(
            'Rating %s: %s gave %s★ to %s/%s',
            'created' if created else 'updated',
            request.user.email, score, target_type, target_id,
        )

        serializer = RatingSerializer(rating)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Engagement Summary — read-only stats
# ---------------------------------------------------------------------------

class EngagementSummaryView(APIView):
    """
    GET /engagement/{target_type}/{target_id}/summary/

    Issue #16: returns pre-calculated stats for a target object.
    Returns zeroed summary if no engagement exists yet.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, target_type, target_id):
        validate_target_type(target_type)  # Issue #1

        summary = EngagementSummary.objects.filter(
            target_type=target_type,
            target_id=target_id,
        ).first()

        if not summary:
            # Return zeroed summary rather than 404 — no engagement yet is valid
            return Response({
                'target_type': target_type,
                'target_id': target_id,
                'avg_rating': '0.00',
                'rating_count': 0,
                'star_1': 0, 'star_2': 0, 'star_3': 0, 'star_4': 0, 'star_5': 0,
                'comment_count': 0,
                'updated_at': None,
            })

        serializer = EngagementSummarySerializer(summary)
        return Response(serializer.data)