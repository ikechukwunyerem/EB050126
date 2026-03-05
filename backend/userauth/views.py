# userauth/views.py
from rest_framework.views import APIView
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests
from .models import User
from .serializers import MyTokenObtainPairSerializer, RegisterSerializer

class RegisterView(generics.CreateAPIView):
    """Endpoint for creating a new email/password account."""
    queryset = User.objects.all()
    permission_classes = [] 
    serializer_class = RegisterSerializer

class MyTokenObtainPairView(TokenObtainPairView):
    """Endpoint for traditional email/password login."""
    serializer_class = MyTokenObtainPairSerializer

class GoogleLoginView(APIView):
    """Endpoint for Google OAuth authentication."""
    permission_classes = []

    def post(self, request):
        token = request.data.get('credential')
        if not token:
            return Response({'error': 'No token provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            idinfo = id_token.verify_oauth2_token(token, requests.Request())
            email = idinfo.get('email')
            
            user, created = User.objects.get_or_create(email=email)
            if created:
                user.set_unusable_password()
                user.first_name = idinfo.get('given_name', '')
                user.last_name = idinfo.get('family_name', '')
                user.save()

            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            }, status=status.HTTP_200_OK)
        except ValueError:
            return Response({'error': 'Invalid Google token'}, status=status.HTTP_401_UNAUTHORIZED)