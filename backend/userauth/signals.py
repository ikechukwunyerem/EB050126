# userauth/signals.py
from django.dispatch import Signal

# Fired by userauth.services.verify_email() after a user's email address
# has been successfully verified and their account activated.
#
# Receivers:
#   - newsletter.signals.auto_subscribe_verified_user
#     (auto-subscribes the user to the newsletter)
#
# kwargs provided to receivers:
#   user (User instance) — the newly verified user
#
# To add more receivers, import this signal in the relevant app's signals.py
# and use @receiver(email_verified). Never import back into userauth.
email_verified = Signal()