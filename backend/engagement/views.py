# engagement/views.py
from rest_framework import generics, permissions
from .models import Comment
from .serializers import CommentSerializer

class TargetCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        # Extract the type (resource/product) and the ID from the URL
        target_type = self.kwargs.get('target_type')
        target_id = self.kwargs.get('target_id')
        
        # Return only non-deleted comments for this specific item
        return Comment.objects.filter(
            target_type=target_type, 
            target_id=target_id,
            is_deleted=False
        ).order_by('-created_at')

    def perform_create(self, serializer):
        target_type = self.kwargs.get('target_type')
        target_id = self.kwargs.get('target_id')
        
        # Save the comment with the logged-in user and the URL parameters
        serializer.save(
            user=self.request.user, 
            target_type=target_type, 
            target_id=target_id
        )