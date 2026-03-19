# Add this block to the BOTTOM of core/settings.py
# It activates S3 storage only when DEBUG=False (production)

import os as _os

if not DEBUG:
    # --- S3 Media Storage ---
    DEFAULT_FILE_STORAGE     = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID        = _os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY    = _os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME  = _os.getenv('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME       = _os.getenv('AWS_S3_REGION_NAME', 'eu-west-1')
    AWS_S3_FILE_OVERWRITE    = False   # never overwrite existing files
    AWS_DEFAULT_ACL          = None    # use bucket policy for access control
    AWS_S3_CUSTOM_DOMAIN     = f"{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com"
    MEDIA_URL                = f"https://{AWS_S3_CUSTOM_DOMAIN}/"

    # Optional: speed up uploads by going direct to the correct region
    AWS_S3_ADDRESSING_STYLE  = 'virtual'
    AWS_S3_SIGNATURE_VERSION = 's3v4'
