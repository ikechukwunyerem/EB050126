# search/serializers.py
from rest_framework import serializers
from .models import SavedSearch


class SavedSearchSerializer(serializers.ModelSerializer):
    """
    Serializer for user-owned saved search bookmarks.
    `query` is required on create. `label` is optional.
    user is set from request.user in the view — never from request body.
    """
    class Meta:
        model = SavedSearch
        fields = ['id', 'query', 'label', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_query(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Query cannot be blank.')
        if len(value) > 200:
            raise serializers.ValidationError('Query must be 200 characters or fewer.')
        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        # unique_together violation → surface a clean 400 instead of a 500
        from django.db import IntegrityError
        try:
            return super().create(validated_data)
        except IntegrityError:
            raise serializers.ValidationError(
                {'query': 'You have already saved this search.'}
            )