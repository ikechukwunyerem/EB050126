# userauth/models.py
import logging
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Validators
# ---------------------------------------------------------------------------

def validate_phone(value):
    """Ensure phone numbers contain only digits, spaces, or a leading '+'."""
    if value and not value.replace('+', '').replace(' ', '').isdigit():
        raise ValidationError(_("Phone number should contain only digits, spaces, or a leading '+'."))


# ---------------------------------------------------------------------------
# Username generation helper
# ---------------------------------------------------------------------------

def _generate_unique_username(model_cls, email, existing_username=None, pk_to_exclude=None):
    """
    Derives a unique username from an email address.
    If existing_username is provided it is validated and returned as-is.
    Raises ValueError if a unique username cannot be produced within constraints.
    """
    MAX_LENGTH = 20
    qs = model_cls.objects.all()
    if pk_to_exclude:
        qs = qs.exclude(pk=pk_to_exclude)

    if existing_username:
        if len(existing_username) > MAX_LENGTH:
            raise ValueError(
                f"Provided username '{existing_username}' exceeds the {MAX_LENGTH}-character limit."
            )
        if qs.filter(username=existing_username).exists():
            raise ValueError(f"Username '{existing_username}' is already taken.")
        return existing_username

    if not email:
        raise ValueError("Cannot generate a username without an email address.")

    base = email.split('@')[0].replace('.', '').replace('_', '').lower() or 'user'
    base = base[:MAX_LENGTH - 3]  # leave room for numeric suffix

    candidate = base
    counter = 1
    while qs.filter(username=candidate).exists():
        suffix = str(counter)
        candidate = f"{base[:MAX_LENGTH - len(suffix)]}{suffix}"
        counter += 1
        if counter > 999:
            raise ValueError("Could not generate a unique username within constraints.")

    return candidate


# ---------------------------------------------------------------------------
# Choices
# ---------------------------------------------------------------------------

GENDER_CHOICES = [
    ('M', _('Male')),
    ('F', _('Female')),
    ('O', _('Other')),
    ('P', _('Prefer not to say')),
]

ADDRESS_TYPE_CHOICES = [
    ('shipping', _('Shipping Address')),
    ('billing', _('Billing Address')),
]


# ---------------------------------------------------------------------------
# User Manager
# ---------------------------------------------------------------------------

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email field must be set'))

        email = self.normalize_email(email).lower()

        # New users are inactive until they verify their email (Critical fix #1)
        extra_fields.setdefault('is_active', False)
        extra_fields.setdefault('email_verified', False)

        provided_username = extra_fields.pop('username', None)
        username = _generate_unique_username(self.model, email, existing_username=provided_username)

        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        # Superusers bypass email verification
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('email_verified', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


# ---------------------------------------------------------------------------
# User Model
# ---------------------------------------------------------------------------

class User(AbstractUser):
    # Auto-generated from email — never required from the user directly
    username = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        verbose_name=_('Username'),
    )
    email = models.EmailField(unique=True, verbose_name=_('Email Address'))
    phone = models.CharField(
        max_length=20, blank=True, null=True,
        verbose_name=_('Phone Number'),
        validators=[validate_phone],
    )

    # Gate login until email is confirmed (Critical fix #1 from review)
    is_active = models.BooleanField(default=False, verbose_name=_('Active'))
    email_verified = models.BooleanField(default=False, verbose_name=_('Email Verified'))

    # Adopted point #7: users can bookmark resources for later via SavedResource through-model
    saved_resources = models.ManyToManyField(
        'resources.Resource',
        through='resources.SavedResource',
        related_name='users_who_saved',
        blank=True,
        verbose_name=_('Saved Resources'),
    )

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    @property
    def full_name(self):
        """Convenience property — adopted from example (point #3)."""
        return f'{self.first_name} {self.last_name}'.strip()

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        # Point #5: always store email lowercase to prevent duplicate account issues
        if self.email:
            self.email = self.email.lower()
        # Point #6: auto-generate username on first save if not already set
        if not self.username:
            try:
                self.username = _generate_unique_username(
                    self.__class__, self.email, pk_to_exclude=self.pk
                )
            except ValueError as e:
                logger.error(f"Could not auto-generate username for {self.email}: {e}")
        super().save(*args, **kwargs)

    def get_verification_link(self, request):
        """
        Point #4: encapsulates UID + token + URL construction on the model,
        keeping this logic out of serializers and views.
        """
        uid = urlsafe_base64_encode(force_bytes(self.pk))
        token = default_token_generator.make_token(self)
        relative_url = reverse('userauth:verify-email', kwargs={'uidb64': uid, 'token': token})
        return request.build_absolute_uri(relative_url)


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    image = models.ImageField(
        upload_to='profile_images/',
        default='default/default-user.jpg',
        null=True, blank=True,
        verbose_name=_('Profile Image'),
    )
    about = models.TextField(null=True, blank=True, verbose_name=_('About Me'))
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, null=True, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Profile of {self.user.full_name or self.user.email}'


# ---------------------------------------------------------------------------
# Address
# ---------------------------------------------------------------------------

class Address(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='addresses',
        verbose_name=_('User'),
    )
    address_type = models.CharField(
        _('Address Type'), max_length=10,
        choices=ADDRESS_TYPE_CHOICES, default='shipping',
        help_text=_('Purpose of this address (e.g., shipping, billing)'),
    )
    recipient_name = models.CharField(
        _('Recipient Name'), max_length=255,
        help_text=_('Full name of the person at this address'),
    )
    address_line1 = models.CharField(_('Address Line 1'), max_length=255)
    address_line2 = models.CharField(_('Address Line 2'), max_length=255, blank=True, null=True)
    city = models.CharField(_('City'), max_length=100)
    state_province_county = models.CharField(_('State/Province/County'), max_length=100, blank=True, null=True)
    postal_code = models.CharField(_('Postal Code'), max_length=20, blank=True, null=True)
    country = models.CharField(_('Country'), max_length=100, default='Nigeria')
    phone_number = models.CharField(_('Phone Number'), max_length=30, blank=True, null=True)

    is_default_shipping = models.BooleanField(_('Default Shipping Address'), default=False)
    is_default_billing = models.BooleanField(_('Default Billing Address'), default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default_shipping', '-is_default_billing', '-updated_at']
        verbose_name = _('Address')
        verbose_name_plural = _('Addresses')

    def __str__(self):
        # Point #9: more readable admin/API display
        parts = [self.recipient_name, self.address_line1, self.city]
        if self.postal_code:
            parts.append(self.postal_code)
        if self.country:
            parts.append(f'({self.country})')
        return ', '.join(filter(None, parts))

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.is_default_shipping:
                Address.objects.filter(
                    user=self.user, is_default_shipping=True
                ).exclude(pk=self.pk).update(is_default_shipping=False)
            if self.is_default_billing:
                Address.objects.filter(
                    user=self.user, is_default_billing=True
                ).exclude(pk=self.pk).update(is_default_billing=False)
            super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# Signals
# ---------------------------------------------------------------------------

@receiver(post_save, sender=User)
def create_user_profile_signal(sender, instance, created, **kwargs):
    """Automatically create a Profile whenever a new User is created."""
    if created:
        Profile.objects.create(user=instance)
        logger.info(f'Profile created for new user: {instance.email}')
        # NOTE: Newsletter auto-subscription to be wired in here later (point #8)