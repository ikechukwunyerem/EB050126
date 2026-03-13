# userauth/serializers.py
import logging
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import User, Address, Profile
from .tasks import send_verification_email_task

logger = logging.getLogger(__name__)


class AddressSerializer(serializers.ModelSerializer):
    """Handles creation and retrieval of user shipping/billing addresses."""

    class Meta:
        model = Address
        fields = [
            'id', 'address_type', 'recipient_name', 'address_line1', 'address_line2',
            'city', 'state_province_county', 'postal_code', 'country', 'phone_number',
            'is_default_shipping', 'is_default_billing',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        # User is injected via perform_create in the view — not from request here
        # to keep the serializer reusable outside of request contexts.
        return super().create(validated_data)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Extends the login response to include basic user profile data."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'full_name': self.user.full_name,
            'username': self.user.username,
        }
        return data


class RegisterSerializer(serializers.ModelSerializer):
    """Handles new user creation with password hashing and async email verification."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'password')

    def validate_email(self, value):
        """Fix #13: Return a clean 400 instead of a 500 IntegrityError on duplicate emails."""
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        """Fix #7: Run Django's full AUTH_PASSWORD_VALIDATORS suite."""
        try:
            django_validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )

        # Dispatch verification email via Celery.
        # Uses the model method so URL construction logic lives in one place.
        request = self.context.get('request')
        if request:
            try:
                verification_link = user.get_verification_link(request)
                send_verification_email_task.delay(user.id, verification_link)
                logger.info(f"Verification email task dispatched for {user.email}")
            except Exception as e:
                # Never fail registration just because Celery/Redis is temporarily down
                logger.error(f"Failed to dispatch verification email for {user.email}: {e}")

        return user


class ProfileSerializer(serializers.ModelSerializer):
    """Serializes the user's profile, including editable name fields from the User model."""
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.ReadOnlyField(source='user.email')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Profile
        fields = ['id', 'email', 'username', 'full_name', 'first_name', 'last_name', 'image', 'about', 'gender']

    def update(self, instance, validated_data):
        # Extract and apply user-level fields separately
        user_data = validated_data.pop('user', {})
        user = instance.user

        update_fields = []
        if 'first_name' in user_data:
            user.first_name = user_data['first_name']
            update_fields.append('first_name')
        if 'last_name' in user_data:
            user.last_name = user_data['last_name']
            update_fields.append('last_name')

        # Fix #8: only write the fields that changed, preventing overwrite of concurrent changes
        if update_fields:
            user.save(update_fields=update_fields)

        return super().update(instance, validated_data)