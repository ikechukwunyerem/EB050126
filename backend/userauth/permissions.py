# userauth/permissions.py
from rest_framework import permissions
from django.utils.translation import gettext_lazy as _


class IsAddressOwner(permissions.BasePermission):
    """
    Object-level permission: only the owner of an address may access or modify it.
    Point #19: includes a custom error message and an explicit authentication guard.
    """
    message = _('You do not have permission to access or modify this address.')

    def has_object_permission(self, request, view, obj):
        # Explicit auth check as a safety net (IsAuthenticated on the view handles
        # the primary gate, but this guard prevents issues if permissions are misconfigured)
        if not request.user or not request.user.is_authenticated:
            return False

        # Point #14 from original review: explicitly allow safe methods
        if request.method in permissions.SAFE_METHODS:
            return obj.user == request.user

        return obj.user == request.user