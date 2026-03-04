# userauth/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
from .models import User

class GoogleLoginView(APIView):
    permission_classes = [] # Allow unauthenticated users to hit this endpoint

    def post(self, request):
        token = request.data.get('credential')
        if not token:
            return Response({'error': 'No token provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify the token with Google
            # Note: Later we will add settings.GOOGLE_CLIENT_ID to strictly verify the audience
            idinfo = id_token.verify_oauth2_token(token, requests.Request())

            email = idinfo.get('email')
            if not email:
                return Response({'error': 'Email not provided by Google'}, status=status.HTTP_400_BAD_REQUEST)

            # Get or create the user in our database
            user, created = User.objects.get_or_create(email=email)
            if created:
                user.set_unusable_password() # They use Google, no password needed
                user.first_name = idinfo.get('given_name', '')
                user.last_name = idinfo.get('family_name', '')
                user.save()

            # Generate our system's JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_new': created
                }
            }, status=status.HTTP_200_OK)

        except ValueError:
            return Response({'error': 'Invalid Google token'}, status=status.HTTP_401_UNAUTHORIZED)