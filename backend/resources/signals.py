# resources/signals.py
#
# All django-imagekit cache-invalidation signals have been removed.
# Image resizing and thumbnail generation now happen directly in
# Resource.save() via Pillow — no cache layer, no signals needed.
#