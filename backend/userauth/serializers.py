# userauth/serializers.py
import logging
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.urls import reverse

from .models import User, Address, Profile
from .tasks import send_verification_email_task

logger = logging.getLogger(__name__)

class AddressSerializer(serializers.ModelSerializer):
    """Handles the creation and retrieval of user shipping/billing addresses."""
    class Meta:
        model = Address
        fields = [
            'id', 'address_type', 'recipient_name', 'address_line1', 'address_line2', 
            'city', 'state_province_county', 'postal_code', 'country', 'phone_number',
            'is_default_shipping', 'is_default_billing'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        # Automatically inject the logged-in user from the request context
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Customizes the Login response to include user profile data."""
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
        }
        return data


class RegisterSerializer(serializers.ModelSerializer):
    """Handles new user creation with password hashing and async email verification."""
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'password')

    def create(self, validated_data):
        # 1. Create the user and hash the password
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        
        # 2. Grab the request context to build a complete URL
        request = self.context.get('request')
        if request:
            try:
                # 3. Generate secure UID and Token
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                
                # 4. Build the absolute URL pointing to our VerifyEmailView
                relative_url = reverse('verify_email', kwargs={'uidb64': uid, 'token': token})
                verification_link = request.build_absolute_uri(relative_url)
                
                # 5. Hand the job off to Celery in the background
                send_verification_email_task.delay(user.id, verification_link)
                logger.info(f"Dispatched Celery verification email task for {user.email}")
            except Exception as e:
                # Log the error, but don't fail the registration if Redis/Celery is down
                logger.error(f"Failed to dispatch email task for {user.email}: {e}")

        return user

class ProfileSerializer(serializers.ModelSerializer):
    # We bring in the user's name so we can edit it from the same form
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    email = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = Profile
        fields = ['id', 'image', 'about', 'gender', 'first_name', 'last_name', 'email']

    def update(self, instance, validated_data):
        # Extract user data and update the User model
        user_data = validated_data.pop('user', {})
        user = instance.user
        
        if 'first_name' in user_data:
            user.first_name = user_data['first_name']
        if 'last_name' in user_data:
            user.last_name = user_data['last_name']
        user.save()

        # Update the Profile model (image, about, gender)
        return super().update(instance, validated_data)