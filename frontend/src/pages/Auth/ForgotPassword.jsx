// src/pages/Auth/ForgotPassword.jsx
// POST /api/auth/password-reset/ → always returns 200 (prevents email enumeration)

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { requestPasswordReset } from '../../api/auth';
import Button    from '../../components/ui/Button/Button';
import FormField from '../../components/forms/FormField';
import styles from './Auth.module.css';
import SEO from '../../components/seo/SEO';

export default function ForgotPassword() {
  const [email,     setEmail]     = useState('');
  const [emailErr,  setEmailErr]  = useState('');
  const [apiError,  setApiError]  = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setEmailErr('');

    if (!email.trim()) {
      setEmailErr('Email is required.');
      return;
    }
    if (!email.includes('@')) {
      setEmailErr('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      // Always show success — backend returns 200 regardless of whether
      // the email exists, to prevent user enumeration.
      setSubmitted(true);
    } catch {
      setApiError('Something went wrong. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.authPageCentered}>
      <SEO
        title="Forgot Password"
        description="Reset your Efiko Education account password."
        noindex
      />

        <div className={styles.authCard}>
          <div className={`${styles.authCardIcon} ${styles.iconSuccess}`}>
            <FaCheckCircle aria-hidden="true" />
          </div>
          <h1 className={styles.authTitle}>Check your inbox</h1>
          <p className={styles.authSubtitle}>
            If an account exists for <strong>{email}</strong>, we've sent a
            password reset link. It expires in 1 hour.
          </p>
          <p className={styles.formLink} style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
            <Link to="/login">Back to Sign In</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authPageCentered}>
      <div className={styles.authCard}>
        <div className={`${styles.authCardIcon} ${styles.iconPrimary}`}>
          <FaEnvelope aria-hidden="true" />
        </div>

        <h1 className={styles.authTitle}>Reset your password</h1>
        <p className={styles.authSubtitle}>
          Enter the email address on your account and we'll send you a reset link.
        </p>

        {apiError && (
          <div className={styles.alertError} role="alert">
            <FaExclamationCircle className={styles.alertIcon} aria-hidden="true" />
            {apiError}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField
            id="email"
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailErr}
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={loading}
            style={{ marginTop: 'var(--space-2)' }}
          >
            Send Reset Link
          </Button>
        </form>

        <div className={styles.formLinks} style={{ marginTop: 'var(--space-5)' }}>
          <p className={styles.formLink}>
            Remembered it? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
