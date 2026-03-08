# userauth/views.py
from rest_framework.views import APIView
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

# Aliasing Google's request module so it doesn't conflict with Python's standard requests library
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests 

import requests  # Standard Python requests library for downloading images
import uuid
from django.core.files.base import ContentFile

from .models import User, Address, Profile
from .serializers import ( MyTokenObtainPairSerializer, RegisterSerializer, AddressSerializer, ProfileSerializer
)
from .services import verify_email
from .permissions import IsAddressOwner
from cart.models import Cart, CartItem

def merge_guest_cart(request, user):
    """
    Checks if the user had a guest cart in their session.
    If yes, merges those items into their permanent authenticated cart.
    """
    session_key = request.session.session_key
    if not session_key:
        return

    try:
        # Find the guest cart
        guest_cart = Cart.objects.get(session_key=session_key, user=None)
        # Find or create the permanent user cart
        user_cart, _ = Cart.objects.get_or_create(user=user)

        # Move all items
        for guest_item in guest_cart.items.all():
            user_item, created = CartItem.objects.get_or_create(
                cart=user_cart, 
                product=guest_item.product
            )
            if not created:
                # If they already had it in their user cart, increase the quantity
                user_item.quantity += guest_item.quantity
                user_item.save()
            else:
                user_item.quantity = guest_item.quantity
                user_item.save()
        
        # Destroy the ghost cart to prevent database bloat
        guest_cart.delete()
    except Cart.DoesNotExist:
        pass


# --- AUTHENTICATION FLOWS ---

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny] 
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Account created successfully. Please check your email for the verification link."},
            status=status.HTTP_201_CREATED
        )

class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, uidb64, token):
        user = verify_email(uidb64, token)
        if user:
            return Response({"message": "Email verified successfully. You can now log in."}, status=status.HTTP_200_OK)
        return Response({"error": "Invalid or expired verification link."}, status=status.HTTP_400_BAD_REQUEST)

class MyTokenObtainPairView(TokenObtainPairView):
    """Endpoint for traditional email/password login, upgraded with Cart Merging."""
    serializer_class = MyTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        # 1. Execute standard login logic
        response = super().post(request, *args, **kwargs)
        
        # 2. If login is successful, merge the guest cart
        if response.status_code == 200:
            email = request.data.get('email')
            try:
                user = User.objects.get(email=email)
                merge_guest_cart(request, user)
            except User.DoesNotExist:
                pass
                
        return response

class GoogleLoginView(APIView):
    """Endpoint for Google OAuth authentication, upgraded with Auto-Avatars and Cart Merging."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('credential')
        if not token:
            return Response({'error': 'No token provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 1. Verify token with Google
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request())
            email = idinfo.get('email')
            
            # 2. Find or Create User
            user, created = User.objects.get_or_create(email=email)
            if created:
                user.set_unusable_password()
                user.first_name = idinfo.get('given_name', '')
                user.last_name = idinfo.get('family_name', '')
                user.save()

            # 3. AUTO-AVATAR: Explicitly fetch the Profile to bypass Django's memory cache
            picture_url = idinfo.get('picture')
            
            if picture_url:
                profile, _ = Profile.objects.get_or_create(user=user)
                
                # Check if the image field is empty or contains the word 'default'
                if not profile.image or 'default' in getattr(profile.image, 'name', 'default'):
                    try:
                        # Adding a 5-second timeout so a slow Google server doesn't freeze the login
                        img_response = requests.get(picture_url, stream=True, timeout=5)
                        
                        if img_response.status_code == 200:
                            image_name = f"{user.id}_google_avatar_{uuid.uuid4().hex[:6]}.jpg"
                            profile.image.save(image_name, ContentFile(img_response.content), save=True)
                            print(f"Successfully downloaded Google avatar for {email}")
                        else:
                            print(f"Failed to download Google avatar. Status code: {img_response.status_code}")
                    except Exception as e:
                        print(f"Google Avatar Download Exception: {e}")

            # 4. CART MERGING: Preserve their guest shopping session
            merge_guest_cart(request, user)

            # 5. Generate platform JWTs
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

# --- ADDRESS BOOK (E-COMMERCE) ---
class AddressListCreateView(generics.ListCreateAPIView):    
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated, IsAddressOwner]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """Fetches and updates the logged-in user's profile."""
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Automatically fetch the profile for the user making the request
        profile, created = Profile.objects.get_or_create(user=self.request.user)
        return profile