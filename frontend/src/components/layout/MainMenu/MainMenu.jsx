// src/components/layout/MainMenu/MainMenu.jsx
// Owns panel state and passes props to focused subcomponents.
// Each panel (search, cart, megamenu) is a separate component.

import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes, FaShoppingCart } from 'react-icons/fa';
import classNames from 'classnames';

import { useAuthStore } from '../../../store/authStore';
import { useCartStore } from '../../../store/cartStore';
import UserDropdown from './UserDropdown';
import SearchPanel  from './SearchPanel';
import CartPanel    from './CartPanel';
import MobileMenu   from './MobileMenu';
import styles from './MainMenu.module.css';

export default function MainMenu({ items = [] }) {
  const navigate   = useNavigate();
  const menuRef    = useRef(null);

  // Which panel is active: null | 'search' | 'cart' | <megamenu-slug>
  const [activePanel,    setActivePanel]    = useState(null);
  const [userDropOpen,   setUserDropOpen]   = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [mobileQuery,    setMobileQuery]    = useState('');

  const isLoggedIn  = useAuthStore((s) => s.isLoggedIn());
  const totalItems  = useCartStore((s) => s.total_items);

  const navLinks  = items.filter((i) => i.type === 'link' || i.type === 'megamenu');
  const hasSearch = items.some((i) => i.type === 'search');
  const hasCart   = items.some((i) => i.type === 'cart');

  // Close all panels on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActivePanel(null);
        setUserDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lock scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const togglePanel = (slug) =>
    setActivePanel((prev) => (prev === slug ? null : slug));

  const closeAll = () => {
    setActivePanel(null);
    setUserDropOpen(false);
  };

  const handleMobileSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      const q = mobileQuery.trim();
      if (!q) return;
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setMobileOpen(false);
      setMobileQuery('');
    }
  };

  const activeMegamenu = navLinks.find(
    (i) => i.type === 'megamenu' && i.slug === activePanel
  );

  return (
    <header className={styles.header} ref={menuRef}>
      <div className={styles.menuContent}>

        {/* ── Upper bar ── */}
        <div className={styles.upperBar}>

          {/* Logo */}
          <div className={styles.logoArea}>
            <Link to="/" onClick={closeAll} className={styles.logoLink}>
              <span className={styles.logoText}>Efiko</span>
              <span className={styles.logoSub}>Education</span>
            </Link>
          </div>

          {/* Right controls */}
          <div className={styles.upperRight}>
            {!isLoggedIn ? (
              <div className={styles.authBtns}>
                <Link to="/login"    className={styles.btnLogin}>Log In</Link>
                <Link to="/register" className={styles.btnSignup}>Sign Up</Link>
              </div>
            ) : (
              <UserDropdown
                isOpen={userDropOpen}
                onToggle={() => {
                  setUserDropOpen((p) => !p);
                  setActivePanel(null);
                }}
                onClose={() => setUserDropOpen(false)}
              />
            )}

            {/* Mobile: cart badge + hamburger */}
            <div className={styles.mobileControls}>
              {hasCart && (
                <button
                  type="button"
                  className={styles.mobileCartBtn}
                  onClick={() => navigate('/cart')}
                  aria-label={`Cart, ${totalItems} items`}
                >
                  <FaShoppingCart aria-hidden="true" />
                  {totalItems > 0 && (
                    <span className={styles.cartBadge} aria-hidden="true">
                      {totalItems > 99 ? '99+' : totalItems}
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                className={styles.hamburger}
                onClick={() => setMobileOpen((p) => !p)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <FaTimes aria-hidden="true" /> : <FaBars aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Lower bar (desktop) ── */}
        <div className={styles.lowerBar}>
          <nav className={styles.navItems} aria-label="Main navigation">
            {navLinks.map((item) => {
              const isActive = activePanel === item.slug;
              return (
                <div key={item.slug} className={styles.navItemWrapper}>
                  {item.type === 'megamenu' ? (
                    <button
                      type="button"
                      className={classNames(styles.navItem, { [styles.navItemActive]: isActive })}
                      onClick={() => togglePanel(item.slug)}
                      aria-expanded={isActive}
                      aria-haspopup="true"
                    >
                      {item.label}
                      <span className={styles.underline} aria-hidden="true" />
                    </button>
                  ) : (
                    <NavLink
                      to={item.href}
                      className={({ isActive: routeActive }) =>
                        classNames(styles.navItem, { [styles.navItemCurrent]: routeActive })
                      }
                      end={item.href === '/'}
                      onClick={closeAll}
                    >
                      {item.label}
                      <span className={styles.underline} aria-hidden="true" />
                    </NavLink>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right actions: search + cart */}
          <div className={styles.lowerActions}>
            {hasSearch && (
              <button
                type="button"
                className={classNames(styles.actionBtn, {
                  [styles.actionBtnActive]: activePanel === 'search',
                })}
                onClick={() => {
                  togglePanel('search');
                  setUserDropOpen(false);
                }}
                aria-label="Toggle search"
                aria-expanded={activePanel === 'search'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
              </button>
            )}

            {hasCart && (
              <button
                type="button"
                className={classNames(styles.actionBtn, styles.cartActionBtn, {
                  [styles.actionBtnActive]: activePanel === 'cart',
                })}
                onClick={() => {
                  togglePanel('cart');
                  setUserDropOpen(false);
                }}
                aria-label={`Cart, ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
                aria-expanded={activePanel === 'cart'}
              >
                <FaShoppingCart aria-hidden="true" />
                {totalItems > 0 && (
                  <span className={styles.cartBadge} aria-hidden="true">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Dropdown panels ── */}
        {activePanel === 'search' && (
          <div className={styles.panelContainer}>
            <div className="container">
              <SearchPanel isOpen onClose={closeAll} />
            </div>
          </div>
        )}

        {activePanel === 'cart' && (
          <div className={styles.panelContainer}>
            <div className="container">
              <CartPanel onClose={closeAll} />
            </div>
          </div>
        )}

        {activeMegamenu && (
          <div className={styles.panelContainer}>
            <div className="container">
              <p className={styles.megaTitle}>{activeMegamenu.megamenuTitle}</p>
              <ul className={styles.megaList}>
                {activeMegamenu.megamenuContent?.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className={styles.megaLink}
                      onClick={closeAll}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile menu ── */}
      <MobileMenu
        isOpen={mobileOpen}
        items={items}
        onClose={() => setMobileOpen(false)}
        searchQuery={mobileQuery}
        onSearchChange={(e) => setMobileQuery(e.target.value)}
        onSearchSubmit={handleMobileSearch}
      />
    </header>
  );
}
