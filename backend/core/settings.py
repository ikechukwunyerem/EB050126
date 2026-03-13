# core/settings.py
import os
from pathlib import Path
from datetime import timedelta

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from backend/.env
load_dotenv(BASE_DIR / ".env")

# FIX #8: SECRET_KEY now raises a hard error if unset rather than silently
# falling back to 'change-me', which could slip into production undetected.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError(
        "DJANGO_SECRET_KEY environment variable is not set. "
        "Set it in your .env file or deployment environment."
    )

DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() in ("1", "true", "yes", "on")

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")
    if h.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "django.contrib.postgres",

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "mptt",
    "django_bleach",
    "imagekit",
    "django_filters",

    # Local Apps
    "userauth",
    "notifications",
    "resources",
    "engagement",
    "subscriptions",
    "payments",
    "products",
    "cart",
    "orders",
    "blog",
    "search",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# --- Database (PostgreSQL) ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "efiko"),
        "USER": os.getenv("DB_USER", "master"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Custom User Model ---
AUTH_USER_MODEL = "userauth.User"

# --- DRF/JWT ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# --- Celery ---
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = os.getenv("CELERY_TIMEZONE", "Africa/Lagos")

# --- Media ---
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# --- CORS ---
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

# --- django-bleach defaults (overridden per-field where needed) ---
BLEACH_ALLOWED_TAGS = ['p', 'b', 'i', 'u', 'em', 'strong', 'a', 'ul', 'ol', 'li']
BLEACH_ALLOWED_ATTRIBUTES = {'a': ['href', 'title', 'rel']}
BLEACH_STRIP_TAGS = True
BLEACH_STRIP_COMMENTS = True

# --- Integrations ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# --- Email ---
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "Efiko <noreply@efiko.com>")
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
# Production: switch EMAIL_BACKEND to "anymail.backends.mailgun.EmailBackend" (or similar)
# and set the relevant ANYMAIL settings via environment variables.

# --- Notifications app ---
APP_DISPLAY_NAME = os.getenv("APP_DISPLAY_NAME", "Efiko")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "support@efiko.com")
PASSWORD_RESET_TIMEOUT_HOURS = 1  # Mirrors Django's PASSWORD_RESET_TIMEOUT (3 days default → override to 1 hour)
PASSWORD_RESET_TIMEOUT = 3600     # Django uses seconds; 3600 = 1 hour

# --- DRF throttle rates (applied to ResendVerification & RequestPasswordReset views) ---
# Merged into REST_FRAMEWORK dict — defined separately here so they're easy to tune.
REST_FRAMEWORK.update({
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "email_resend": os.getenv("THROTTLE_EMAIL_RESEND", "5/hour"),
        "password_reset": os.getenv("THROTTLE_PASSWORD_RESET", "5/hour"),
    },
})

# --- Email template directories ---
# Tells Django's template engine where to find the notifications email templates.
# Add the notifications/templates directory to TEMPLATES[0]['DIRS'].
TEMPLATES[0]["DIRS"] = [BASE_DIR / "notifications" / "templates"]

# --- django-imagekit ---
# Thumbnails are generated on first request and stored in MEDIA_ROOT.
# IMAGEKIT_CACHEFILE_DIR controls the subdirectory within MEDIA_ROOT.
IMAGEKIT_CACHEFILE_DIR = 'CACHE/images'
# Use Redis for the imagekit async strategy (consistent with existing Celery/Redis setup)
IMAGEKIT_DEFAULT_CACHEFILE_STRATEGY = 'imagekit.cachefiles.strategies.Optimistic'

# --- django-filter ---
# Makes DjangoFilterBackend available globally in DRF viewsets
REST_FRAMEWORK.update({
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
})