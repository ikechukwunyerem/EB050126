// src/pages/Auth/VerifyEmail.jsx
// GET /api/auth/verify-email/<uidb64>/<token>/
// This page is landed on from the email link.
// It fires the verification request automatically on mount.

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaCheckCircle, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import { verifyEmail } from '../../api/auth';
import styles from './Auth.module.css';
import SEO from '../../components/seo/SEO';

const STATUS = { VERIFYING: 'verifying', SUCCESS: 'success', FAILED: 'failed' };

export default function VerifyEmail() {
  const { uidb64, token } = useParams();
  const [status, setStatus] = useState(STATUS.VERIFYING);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!uidb64 || !token) {
      setStatus(STATUS.FAILED);
      setMessage('Invalid verification link. Please request a new one.');
      return;
    }

    verifyEmail(uidb64, token)
      .then(() => setStatus(STATUS.SUCCESS))
      .catch((err) => {
        setStatus(STATUS.FAILED);
        setMessage(
          err?.response?.data?.detail ||
          err?.response?.data?.error  ||
          'This verification link is invalid or has expired.'
        );
      });
  }, [uidb64, token]);

  return (
    <div className={styles.authPageCentered}>
      <SEO
        title="Verify Email"
        description="Verify your Efiko Education account email address."
        noindex
      />

      <div className={styles.authCard}>

        {status === STATUS.VERIFYING && (
          <>
            <div className={`${styles.authCardIcon} ${styles.iconPrimary}`}>
              <FaSpinner style={{ animation: 'spin 0.7s linear infinite' }} aria-hidden="true" />
            </div>
            <h1 className={styles.authTitle}>Verifying your email…</h1>
            <p className={styles.authSubtitle}>
              Please wait while we confirm your account.
            </p>
          </>
        )}

        {status === STATUS.SUCCESS && (
          <>
            <div className={`${styles.authCardIcon} ${styles.iconSuccess}`}>
              <FaCheckCircle aria-hidden="true" />
            </div>
            <h1 className={styles.authTitle}>Email verified!</h1>
            <p className={styles.authSubtitle}>
              Your account is now active. You can sign in and start exploring resources.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '48px',
                marginTop: 'var(--space-6)',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-neutral-0)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 'var(--weight-bold)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                textDecoration: 'none',
                transition: 'background-color var(--transition-fast)',
              }}
            >
              Sign In
            </Link>
          </>
        )}

        {status === STATUS.FAILED && (
          <>
            <div className={`${styles.authCardIcon} ${styles.iconWarning}`}>
              <FaExclamationCircle aria-hidden="true" />
            </div>
            <h1 className={styles.authTitle}>Verification failed</h1>
            <div className={styles.alertError} style={{ marginBottom: 'var(--space-6)' }}>
              <FaExclamationCircle className={styles.alertIcon} aria-hidden="true" />
              {message}
            </div>
            <p className={styles.authSubtitle}>
              Verification links expire after 1 hour.
              <br />
              <Link to="/login">Sign in</Link> to request a new one.
            </p>
          </>
        )}

      </div>
    </div>
  );
}
