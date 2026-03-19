// src/pages/Auth/Register.jsx
// POST /api/auth/register/ → 201 (email verify required before login)
// Google path: GoogleLogin component → credential → POST /api/auth/google/ → auto-login

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { FaExclamationCircle, FaCheckCircle } from 'react-icons/fa';

import { register, googleLogin } from '../../api/auth';
import { useAuthStore }  from '../../store/authStore';
import { useCartStore }  from '../../store/cartStore';
import { getCart }       from '../../api/cart';
import { toast }         from '../../components/ui/Toast/Toast';
import Button            from '../../components/ui/Button/Button';
import FormField         from '../../components/forms/FormField';
import SEO               from '../../components/seo/SEO';
import styles from './Auth.module.css';

export default function Register() {
  const navigate   = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const setAuth    = useAuthStore((s) => s.setAuth);
  const setCart    = useCartStore((s) => s.setCart);

  const [fields, setFields] = useState({
    first_name: '', last_name: '', email: '', password: '', confirm: '',
  });
  const [errors,        setErrors]        = useState({});
  const [apiError,      setApiError]      = useState('');
  const [submitted,     setSubmitted]     = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) navigate('/', { replace: true });
  }, [isLoggedIn, navigate]);

  const set = (field) => (e) => setFields((p) => ({ ...p, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!fields.first_name.trim()) errs.first_name = 'First name is required.';
    if (!fields.last_name.trim())  errs.last_name  = 'Last name is required.';
    if (!fields.email.trim())      errs.email      = 'Email is required.';
    else if (!fields.email.includes('@')) errs.email = 'Enter a valid email address.';
    if (!fields.password)          errs.password   = 'Password is required.';
    else if (fields.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (!fields.confirm)           errs.confirm    = 'Please confirm your password.';
    else if (fields.password !== fields.confirm) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        email:      fields.email.trim().toLowerCase(),
        first_name: fields.first_name.trim(),
        last_name:  fields.last_name.trim(),
        password:   fields.password,
      });
      setSubmitted(true);
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        const fieldErrs = {};
        const nonField  = [];
        Object.entries(data).forEach(([key, val]) => {
          const msg = Array.isArray(val) ? val[0] : val;
          if (['email', 'password', 'first_name', 'last_name'].includes(key)) {
            fieldErrs[key] = msg;
          } else {
            nonField.push(msg);
          }
        });
        if (Object.keys(fieldErrs).length) setErrors((p) => ({ ...p, ...fieldErrs }));
        if (nonField.length) setApiError(nonField.join(' '));
      } else {
        setApiError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google sign-up: credential is a Google ID token, backend verifies and creates/finds user
  const handleGoogleSuccess = async ({ credential }) => {
    setApiError('');
    setGoogleLoading(true);
    try {
      const data = await googleLogin(credential);
      setAuth(data.access, data.refresh, data.user);
      try { setCart(await getCart()); } catch { /* non-fatal */ }
      toast.success(`Account ready! Welcome, ${data.user.first_name || 'there'}.`);
      navigate('/', { replace: true });
    } catch (err) {
      setApiError(
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Google sign-up failed. Please try again.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setApiError('Google sign-up was cancelled or failed. Please try again.');
  };

  const isBusy = loading || googleLoading;

  if (submitted) {
    return (
      <div className={styles.authPageCentered}>
        <SEO title="Create Account" description="Create a free Efiko Education account." noindex />
        <div className={styles.authCard}>
          <div className={`${styles.authCardIcon} ${styles.iconSuccess}`}>
            <FaCheckCircle aria-hidden="true" />
          </div>
          <h1 className={styles.authTitle}>Check your inbox</h1>
          <p className={styles.authSubtitle}>
            We sent a verification link to <strong>{fields.email}</strong>.
            Click it to activate your account, then sign in.
          </p>
          <div className={styles.alertInfo} style={{ marginTop: 'var(--space-4)' }}>
            <span>
              Didn't receive it? Check your spam folder or{' '}
              <Link to="/login">try logging in</Link> to resend.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authPage}>
      <SEO title="Create Account" description="Create a free Efiko Education account." noindex />

      <div className={styles.authVisual} aria-hidden="true">
        <div className={styles.authVisualPattern} />
        <div className={styles.authVisualContent}>
          <div className={styles.authVisualBrand}>Join Efiko</div>
          <p className={styles.authVisualTagline}>
            Free access to hundreds of resources. Subscribe for unlimited downloads.
          </p>
          <div className={styles.authVisualStats}>
            <div className={styles.authVisualStat}>
              <span className={styles.authVisualStatNum}>Free</span>
              <span className={styles.authVisualStatLabel}>To sign up</span>
            </div>
            <div className={styles.authVisualStat}>
              <span className={styles.authVisualStatNum}>100+</span>
              <span className={styles.authVisualStatLabel}>Free resources</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.authForm}>
        <div className={styles.authFormInner}>
          <h1 className={styles.authTitle}>Create your account</h1>
          <p className={styles.authSubtitle}>Free to join. No credit card required.</p>

          {apiError && (
            <div className={styles.alertError} role="alert">
              <FaExclamationCircle className={styles.alertIcon} aria-hidden="true" />
              {apiError}
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.formRow}>
              <FormField id="first_name" label="First name" type="text" value={fields.first_name}
                onChange={set('first_name')} error={errors.first_name}
                autoComplete="given-name" placeholder="Ada" required disabled={isBusy} />
              <FormField id="last_name" label="Last name" type="text" value={fields.last_name}
                onChange={set('last_name')} error={errors.last_name}
                autoComplete="family-name" placeholder="Okafor" required disabled={isBusy} />
            </div>
            <FormField id="email" label="Email address" type="email" value={fields.email}
              onChange={set('email')} error={errors.email}
              autoComplete="email" placeholder="you@example.com" required disabled={isBusy} />
            <FormField id="password" label="Password" type="password" value={fields.password}
              onChange={set('password')} error={errors.password} hint="At least 8 characters."
              autoComplete="new-password" placeholder="Create a strong password" required disabled={isBusy} />
            <FormField id="confirm" label="Confirm password" type="password" value={fields.confirm}
              onChange={set('confirm')} error={errors.confirm}
              autoComplete="new-password" placeholder="Repeat your password" required disabled={isBusy} />
            <div className={styles.submitBtn}>
              <Button type="submit" fullWidth size="lg" isLoading={loading} disabled={isBusy}>
                Create Account
              </Button>
            </div>
          </form>

          <div className={styles.divider}>or</div>

          <div className={styles.googleBtnWrapper}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              width="100%"
              text="signup_with"
              shape="rectangular"
              theme="outline"
              size="large"
            />
          </div>

          {googleLoading && (
            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
              Verifying with Google…
            </p>
          )}

          <div className={styles.formLinks}>
            <p className={styles.formLink}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
