// src/pages/Auth/ResetPassword.jsx
// POST /api/auth/password-reset/<uidb64>/<token>/
// Landed on from the reset email link.

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaLock, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { confirmPasswordReset } from '../../api/auth';
import { toast } from '../../components/ui/Toast/Toast';
import Button    from '../../components/ui/Button/Button';
import FormField from '../../components/forms/FormField';
import styles from './Auth.module.css';
import SEO from '../../components/seo/SEO';

export default function ResetPassword() {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  const validate = () => {
    const errs = {};
    if (!password)         errs.password = 'Password is required.';
    else if (password.length < 8)
      errs.password = 'Password must be at least 8 characters.';
    if (!confirm)          errs.confirm  = 'Please confirm your password.';
    else if (password !== confirm)
      errs.confirm  = 'Passwords do not match.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await confirmPasswordReset(uidb64, token, password);
      setDone(true);
      toast.success('Password updated! Please sign in.');
    } catch (err) {
      const data = err?.response?.data;
      if (data?.password) {
        setErrors((p) => ({
          ...p,
          password: Array.isArray(data.password) ? data.password[0] : data.password,
        }));
      } else {
        setApiError(
          data?.detail ||
          data?.error  ||
          'This reset link is invalid or has expired. Please request a new one.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className={styles.authPageCentered}>
      <SEO
        title="Reset Password"
        description="Set a new password for your Efiko Education account."
        noindex
      />

        <div className={styles.authCard}>
          <div className={`${styles.authCardIcon} ${styles.iconSuccess}`}>
            <FaCheckCircle aria-hidden="true" />
          </div>
          <h1 className={styles.authTitle}>Password updated</h1>
          <p className={styles.authSubtitle}>
            Your password has been changed successfully.
            You can now sign in with your new password.
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
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authPageCentered}>
      <div className={styles.authCard}>
        <div className={`${styles.authCardIcon} ${styles.iconPrimary}`}>
          <FaLock aria-hidden="true" />
        </div>

        <h1 className={styles.authTitle}>Set new password</h1>
        <p className={styles.authSubtitle}>
          Choose a strong password for your Efiko account.
        </p>

        {apiError && (
          <div className={styles.alertError} role="alert">
            <FaExclamationCircle className={styles.alertIcon} aria-hidden="true" />
            {apiError}{' '}
            <Link to="/forgot-password">Request a new link.</Link>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField
            id="password"
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint="At least 8 characters."
            autoComplete="new-password"
            placeholder="Create a strong password"
            required
            disabled={loading}
          />

          <FormField
            id="confirm"
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
            autoComplete="new-password"
            placeholder="Repeat your password"
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
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
