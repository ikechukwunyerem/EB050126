# newsletter/views.py
import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import NewsletterSubscriber
from .serializers import NewsletterSubscribeSerializer, NewsletterUnsubscribeSerializer

logger = logging.getLogger(__name__)


class SubscribeView(APIView):
    """
    POST /newsletter/subscribe/

    Body: { email: "user@example.com" }

    Three cases handled:
    1. New email → create subscriber
    2. Existing email, is_active=False → reactivate (re-subscribe)
    3. Existing email, is_active=True → return 200 silently (don't leak subscription status)

    If the request comes from an authenticated user, the subscriber row is
    linked to their account automatically.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = NewsletterSubscribeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = request.user if request.user.is_authenticated else None

        existing = NewsletterSubscriber.objects.filter(email=email).first()

        if existing:
            if not existing.is_active:
                # Reactivate lapsed subscriber
                existing.is_active = True
                existing.unsubscribed_at = None
                if user and not existing.user:
                    existing.user = user
                existing.save(update_fields=['is_active', 'unsubscribed_at', 'user'])
                logger.info('Newsletter: reactivated subscriber %s', email)
            # Already active — return success silently (don't confirm or deny)
        else:
            NewsletterSubscriber.objects.create(email=email, user=user)
            logger.info('Newsletter: new subscriber %s', email)

        return Response(
            {'message': 'You are subscribed to our newsletter.'},
            status=status.HTTP_200_OK,
        )


class UnsubscribeView(APIView):
    """
    POST /newsletter/unsubscribe/

    Body: { token: "<uuid>" }

    Token-based unsubscribe — never accepts raw email to prevent
    third-party unsubscribing of arbitrary addresses.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = NewsletterUnsubscribeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']

        try:
            subscriber = NewsletterSubscriber.objects.get(unsubscribe_token=token)
        except NewsletterSubscriber.DoesNotExist:
            # Return 200 regardless — don't reveal whether the token is valid
            return Response(
                {'message': 'You have been unsubscribed.'},
                status=status.HTTP_200_OK,
            )

        if subscriber.is_active:
            subscriber.is_active = False
            subscriber.unsubscribed_at = timezone.now()
            subscriber.save(update_fields=['is_active', 'unsubscribed_at'])
            logger.info('Newsletter: unsubscribed %s', subscriber.email)

        return Response(
            {'message': 'You have been unsubscribed.'},
            status=status.HTTP_200_OK,
        )


class MySubscriptionView(APIView):
    """
    GET /newsletter/me/

    Returns the newsletter subscription status for the authenticated user.
    Useful for the frontend to pre-fill or show an unsubscribe option in
    the user's account settings page.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscriber = NewsletterSubscriber.objects.filter(
            user=request.user
        ).first()

        if not subscriber:
            return Response({'subscribed': False, 'email': None})

        return Response({
            'subscribed': subscriber.is_active,
            'email': subscriber.email,
            'subscribed_at': subscriber.subscribed_at,
        })