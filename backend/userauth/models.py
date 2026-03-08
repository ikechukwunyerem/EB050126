# userauth/models.py
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
            
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None  
    email = models.EmailField(_('email address'), unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

ADDRESS_TYPE_CHOICES = [
    ('shipping', _('Shipping Address')),
    ('billing', _('Billing Address')),
]

class Address(models.Model):
    user = models.ForeignKey(
        'userauth.User', # String reference avoids circular imports
        on_delete=models.CASCADE,
        related_name='addresses',
        verbose_name=_("User")
    )
    address_type = models.CharField(
        _("Address Type"), max_length=10, choices=ADDRESS_TYPE_CHOICES, default='shipping'
    )
    recipient_name = models.CharField(_("Recipient Name"), max_length=255)
    address_line1 = models.CharField(_("Address Line 1"), max_length=255)
    address_line2 = models.CharField(_("Address Line 2"), max_length=255, blank=True, null=True)
    city = models.CharField(_("City"), max_length=100)
    state_province_county = models.CharField(_("State/Province/County"), max_length=100, blank=True, null=True)
    postal_code = models.CharField(_("Postal Code"), max_length=20, blank=True, null=True)
    country = models.CharField(_("Country"), max_length=100, default="Nigeria")
    phone_number = models.CharField(_("Phone Number"), max_length=30, blank=True, null=True)
    
    is_default_shipping = models.BooleanField(_("Default Shipping Address"), default=False)
    is_default_billing = models.BooleanField(_("Default Billing Address"), default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default_shipping', '-is_default_billing', '-updated_at']
        verbose_name = _('Address')
        verbose_name_plural = _('Addresses')

    def __str__(self):
        return f"{self.recipient_name} - {self.city}"

    def save(self, *args, **kwargs):
        # Atomic transaction ensures only ONE default address exists per type, per user
        with transaction.atomic():
            if self.is_default_shipping:
                Address.objects.filter(user=self.user, is_default_shipping=True).exclude(pk=self.pk).update(is_default_shipping=False)
            if self.is_default_billing:
                Address.objects.filter(user=self.user, is_default_billing=True).exclude(pk=self.pk).update(is_default_billing=False)
            super().save(*args, **kwargs)


GENDER_CHOICES = [
    ('M', _('Male')),
    ('F', _('Female')),
    ('O', _('Other')),
    ('P', _('Prefer not to say')),
]

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    image = models.ImageField(
        upload_to='profile_images/',
        default='default/default-user.jpg', 
        null=True, blank=True, verbose_name=_('Profile Image')
    )
    about = models.TextField(null=True, blank=True, verbose_name=_('About Me'))
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, null=True, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile of {self.user.email}"

# --- AUTOMATION SIGNAL ---
@receiver(post_save, sender=User)
def create_user_profile_signal(sender, instance, created, **kwargs):
    """Automatically create a Profile whenever a new User is created."""
    if created:
        Profile.objects.get_or_create(user=instance)