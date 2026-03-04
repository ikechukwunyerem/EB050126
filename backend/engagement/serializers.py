# engagement/serializers.py
from rest_framework import serializers
from .models import Comment

class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'target_type', 'target_id', 'parent', 'content', 'author_name', 'is_deleted', 'created_at']
        # The user shouldn't set these manually in the JSON body, the URL handles it
        read_only_fields = ['target_type', 'target_id', 'is_deleted'] 

    def get_author_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.email.split('@')[0]