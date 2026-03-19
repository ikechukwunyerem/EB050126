// src/components/layout/MainMenu/MobileMenu.jsx
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import { useAuthStore } from '../../../store/authStore';
import styles from './MainMenu.module.css';

export default function MobileMenu({ isOpen, items, onClose, onSearchSubmit, searchQuery, onSearchChange }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const navLinks   = items.filter((i) => i.type === 'link' || i.type === 'megamenu');

  return (
    <div
      className={`${styles.mobileOverlay} ${isOpen ? styles.mobileOpen : ''}`}
      aria-hidden={!isOpen}
    >
      <div className={styles.mobileContent}>
        {/* Search */}
        <div className={styles.mobileSearch}>
          <div className={styles.mobileSearchInputWrapper}>
            <FaSearch className={styles.mobileSearchIcon} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search Efiko…"
              className={styles.mobileSearchInput}
              value={searchQuery}
              onChange={onSearchChange}
              onKeyDown={onSearchSubmit}
              aria-label="Search"
            />
          </div>
          <button
            type="button"
            className={styles.mobileSearchBtn}
            onClick={onSearchSubmit}
            aria-label="Submit search"
          >
            <FaSearch aria-hidden="true" />
          </button>
        </div>

        {/* Nav links */}
        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          {navLinks.map((item) => (
            <div key={item.slug} className={styles.mobileNavGroup}>
              {item.type === 'megamenu' ? (
                <>
                  <span className={styles.mobileNavHeading}>{item.label}</span>
                  {item.megamenuContent?.map((sub) => (
                    <NavLink
                      key={sub.href}
                      to={sub.href}
                      className={({ isActive }) =>
                        `${styles.mobileNavLink} ${styles.mobileSubLink} ${isActive ? styles.mobileNavActive : ''}`
                      }
                      onClick={onClose}
                    >
                      {sub.label}
                    </NavLink>
                  ))}
                </>
              ) : (
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `${styles.mobileNavLink} ${isActive ? styles.mobileNavActive : ''}`
                  }
                  onClick={onClose}
                  end={item.href === '/'}
                >
                  {item.label}
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {/* Auth links */}
        <div className={styles.mobileAuthSection}>
          {isLoggedIn ? (
            <>
              <Link to="/profile"       className={styles.mobileAuthLink} onClick={onClose}>My Profile</Link>
              <Link to="/subscriptions" className={styles.mobileAuthLink} onClick={onClose}>My Subscription</Link>
              <Link to="/orders"        className={styles.mobileAuthLink} onClick={onClose}>My Orders</Link>
            </>
          ) : (
            <>
              <Link to="/login"    className={`${styles.mobileAuthLink} ${styles.mobileLoginBtn}`}  onClick={onClose}>Log In</Link>
              <Link to="/register" className={`${styles.mobileAuthLink} ${styles.mobileSignupBtn}`} onClick={onClose}>Sign Up Free</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
