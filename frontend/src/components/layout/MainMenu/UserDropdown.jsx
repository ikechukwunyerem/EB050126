// src/components/layout/MainMenu/UserDropdown.jsx
import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUserCircle, FaChevronDown, FaUserEdit, FaCreditCard,
  FaListAlt, FaMapMarkerAlt, FaBookmark, FaSignOutAlt, FaUserShield,
} from 'react-icons/fa';
import { useAuthStore } from '../../../store/authStore';
import { useCartStore } from '../../../store/cartStore';
import * as authApi from '../../../api/auth';
import { tokenStorage } from '../../../api/client';
import { toast } from '../../ui/Toast/Toast';
import styles from './MainMenu.module.css';

export default function UserDropdown({ isOpen, onToggle, onClose }) {
  const dropdownRef = useRef(null);
  const navigate    = useNavigate();
  const user        = useAuthStore((s) => s.user);
  const clearAuth   = useAuthStore((s) => s.clearAuth);
  const clearCart   = useCartStore((s) => s.clearCart);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Derive display name
  const displayName =
    user?.full_name?.trim().split(' ')[0] ||
    user?.first_name ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'Account';

  const profileImageUrl = user?.profile_image_url || null;
  const isStaff = user?.is_staff || user?.is_superuser;

  const handleLogout = async () => {
    onClose();
    try {
      const refresh = tokenStorage.getRefresh();
      if (refresh) {
        // Best-effort blacklist — don't block logout if this fails
        await authApi.refreshToken(refresh).catch(() => {});
      }
    } finally {
      clearAuth();
      clearCart();
      navigate('/');
      toast.success('You have been logged out.');
    }
  };

  const menuItem = (to, Icon, label) => (
    <Link
      to={to}
      className={styles.dropdownItem}
      onClick={onClose}
      role="menuitem"
    >
      <Icon className={styles.dropdownItemIcon} aria-hidden="true" />
      {label}
    </Link>
  );

  return (
    <div className={styles.userDropdownWrapper} ref={dropdownRef}>
      <button
        type="button"
        className={styles.userProfileButton}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account menu"
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={displayName}
            className={styles.userAvatar}
          />
        ) : (
          <FaUserCircle className={styles.userAvatarIcon} aria-hidden="true" />
        )}
        <span className={styles.userDisplayName}>{displayName}</span>
        <FaChevronDown
          className={`${styles.dropdownArrow} ${isOpen ? styles.open : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className={styles.dropdownMenu}
          role="menu"
          aria-label="Account menu"
        >
          <div className={styles.dropdownUser}>
            <span className={styles.dropdownUserName}>{user?.full_name || displayName}</span>
            <span className={styles.dropdownUserEmail}>{user?.email}</span>
          </div>

          <div className={styles.dropdownDivider} role="separator" />

          {isStaff && menuItem('/admin', FaUserShield, 'Admin Dashboard')}
          {menuItem('/profile',           FaUserEdit,    'My Profile')}
          {menuItem('/subscriptions',     FaCreditCard,  'My Subscription')}
          {menuItem('/profile/saved',     FaBookmark,    'Saved Resources')}
          {menuItem('/profile/addresses', FaMapMarkerAlt,'My Addresses')}
          {menuItem('/orders',            FaListAlt,     'My Orders')}

          <div className={styles.dropdownDivider} role="separator" />

          <button
            type="button"
            className={`${styles.dropdownItem} ${styles.logoutItem}`}
            onClick={handleLogout}
            role="menuitem"
          >
            <FaSignOutAlt className={styles.dropdownItemIcon} aria-hidden="true" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
