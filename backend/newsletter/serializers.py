# newsletter/serializers.py
from rest_framework import serializers
from .models import NewsletterSubscriber


class NewsletterSubscribeSerializer(serializers.Serializer):
    """
    Used for POST /newsletter/subscribe/

    Does not extend ModelSerializer because the create logic has a branching
    path: create new subscriber OR reactivate an existing inactive one.
    That logic lives in the view where it can be tested independently.
    """
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class NewsletterUnsubscribeSerializer(serializers.Serializer):
    """
    Used for POST /newsletter/unsubscribe/

    Accepts the UUID token from the unsubscribe link — never the raw email.
    This prevents anyone from unsubscribing an arbitrary address by guessing.
    """
    token = serializers.UUIDField()