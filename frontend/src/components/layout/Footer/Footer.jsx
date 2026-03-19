// src/components/layout/Footer/Footer.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaCheckCircle } from 'react-icons/fa';
import { subscribe } from '../../../api/newsletter';
import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>

      {/* ── Newsletter band ── */}
      <div className={styles.newsletterBand}>
        <div className="container">
          <div className={styles.newsletterInner}>
            <div className={styles.newsletterText}>
              <h2 className={styles.newsletterTitle}>Stay in the loop</h2>
              <p className={styles.newsletterSub}>
                New resources, teaching tips, and updates — delivered to your inbox.
                No spam, ever.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* ── Main footer ── */}
      <div className={`container ${styles.inner}`}>

        <div className={styles.brand}>
          <Link to="/" className={styles.logoLink}>
            <span className={styles.logoText}>Efiko</span>
          </Link>
          <p className={styles.tagline}>
            Quality teaching resources for Nigerian educators and parents.
          </p>
        </div>

        <nav className={styles.links} aria-label="Footer navigation">
          <div className={styles.linkGroup}>
            <h3 className={styles.groupTitle}>Resources</h3>
            <Link to="/resources">All Resources</Link>
            <Link to="/resources?access_level=free">Free Resources</Link>
            <Link to="/resources?resource_type=worksheet">Worksheets</Link>
            <Link to="/resources?resource_type=lesson_plan">Lesson Plans</Link>
          </div>

          <div className={styles.linkGroup}>
            <h3 className={styles.groupTitle}>Shop</h3>
            <Link to="/products">All Products</Link>
            <Link to="/cart">My Cart</Link>
            <Link to="/orders">My Orders</Link>
          </div>

          <div className={styles.linkGroup}>
            <h3 className={styles.groupTitle}>Account</h3>
            <Link to="/profile">My Profile</Link>
            <Link to="/subscriptions">Subscription</Link>
            <Link to="/profile/saved">Saved Resources</Link>
            <Link to="/pricing">Pricing Plans</Link>
          </div>

          <div className={styles.linkGroup}>
            <h3 className={styles.groupTitle}>Company</h3>
            <Link to="/blog">Blog</Link>
            <Link to="/search">Search</Link>
          </div>
        </nav>

      </div>

      {/* ── Bottom bar ── */}
      <div className={styles.bottom}>
        <div className="container">
          <p className={styles.copyright}>
            © {year} Efiko Education. All rights reserved.
          </p>
        </div>
      </div>

    </footer>
  );
}

// ── Newsletter form — self-contained so it manages its own state ──────────────
function NewsletterForm() {
  const [email,     setEmail]     = useState('');
  const [status,    setStatus]    = useState('idle'); // idle | loading | success | error
  const [errorMsg,  setErrorMsg]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!trimmed.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      await subscribe(trimmed.toLowerCase());
      setStatus('success');
      setEmail('');
    } catch (err) {
      // Backend returns 200 for all cases (prevents enumeration),
      // so a real error here is a network/server failure
      setErrorMsg(
        err?.response?.data?.email?.[0] ||
        err?.response?.data?.detail     ||
        'Something went wrong. Please try again.'
      );
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className={styles.newsletterSuccess}>
        <FaCheckCircle className={styles.newsletterSuccessIcon} aria-hidden="true" />
        <div>
          <p className={styles.newsletterSuccessTitle}>You're subscribed!</p>
          <p className={styles.newsletterSuccessMsg}>
            Thank you — look out for updates in your inbox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.newsletterForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.newsletterInputRow}>
        <label htmlFor="footer-newsletter-email" className={styles.newsletterLabel}>
          Email address
        </label>
        <div className={styles.newsletterInputGroup}>
          <input
            id="footer-newsletter-email"
            type="email"
            className={`${styles.newsletterInput} ${errorMsg ? styles.newsletterInputError : ''}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
            disabled={status === 'loading'}
            autoComplete="email"
            aria-describedby={errorMsg ? 'newsletter-error' : undefined}
          />
          <button
            type="submit"
            className={styles.newsletterBtn}
            disabled={status === 'loading'}
            aria-label="Subscribe to newsletter"
          >
            {status === 'loading'
              ? <span className={styles.newsletterSpinner} aria-hidden="true" />
              : <><span>Subscribe</span><FaArrowRight aria-hidden="true" /></>
            }
          </button>
        </div>
        {errorMsg && (
          <p id="newsletter-error" className={styles.newsletterError} role="alert">
            {errorMsg}
          </p>
        )}
      </div>
    </form>
  );
}
