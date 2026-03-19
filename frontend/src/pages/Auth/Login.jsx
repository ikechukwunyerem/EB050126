// src/pages/Auth/Login.jsx
// POST /api/auth/login/   → { access, refresh, user }
// POST /api/auth/google/  → { access, refresh, user }
//
// Google auth uses the GoogleLogin component from @react-oauth/google.
// It renders Google's own button and calls onSuccess with { credential },
// where credential is a Google ID token (JWT) that the backend verifies
// using id_token.verify_oauth2_token() from google-auth-library.
// This is different from useGoogleLogin which returns an access_token.

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { FaExclamationCircle } from 'react-icons/fa';

import { login, googleLogin } from '../../api/auth';
import { useAuthStore }  from '../../store/authStore';
import { useCartStore }  from '../../store/cartStore';
import { getCart }       from '../../api/cart';
import { toast }         from '../../components/ui/Toast/Toast';
import Button            from '../../components/ui/Button/Button';
import FormField         from '../../components/forms/FormField';
import SEO               from '../../components/seo/SEO';
import styles from './Auth.module.css';

export default function Login() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname || '/';

  const setAuth    = useAuthStore((s) => s.setAuth);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const setCart    = useCartStore((s) => s.setCart);

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [errors,        setErrors]        = useState({});
  const [apiError,      setApiError]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) navigate(from, { replace: true });
  }, [isLoggedIn, navigate, from]);

  const handleAuthSuccess = async (access, refresh, user) => {
    setAuth(access, refresh, user);
    try { setCart(await getCart()); } catch { /* non-fatal */ }
    toast.success(`Welcome back, ${user.first_name || user.username || 'there'}!`);
    navigate(from, { replace: true });
  };

  const validate = () => {
    const errs = {};
    if (!email.trim())             errs.email    = 'Email is required.';
    else if (!email.includes('@')) errs.email    = 'Enter a valid email address.';
    if (!password)                 errs.password = 'Password is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await login(email.trim().toLowerCase(), password);
      await handleAuthSuccess(data.access, data.refresh, data.user);
    } catch (err) {
      setApiError(
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Incorrect email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // GoogleLogin component calls onSuccess with { credential: "<google_id_token>" }
  const handleGoogleSuccess = async ({ credential }) => {
    setApiError('');
    setGoogleLoading(true);
    try {
      const data = await googleLogin(credential);
      await handleAuthSuccess(data.access, data.refresh, data.user);
    } catch (err) {
      setApiError(
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Google sign-in failed. Please try again.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setApiError('Google sign-in was cancelled or failed. Please try again.');
  };

  const isBusy = loading || googleLoading;

  return (
    <div className={styles.authPage}>
      <SEO title="Sign In" description="Sign in to your Efiko Education account." noindex />

      <div className={styles.authVisual} aria-hidden="true">
        <div className={styles.authVisualPattern} />
        <div className={styles.authVisualContent}>
          <div className={styles.authVisualBrand}>Efiko Education</div>
          <p className={styles.authVisualTagline}>
            Thousands of worksheets and lesson plans crafted for Nigerian classrooms.
          </p>
          <div className={styles.authVisualStats}>
            <div className={styles.authVisualStat}>
              <span className={styles.authVisualStatNum}>10k+</span>
              <span className={styles.authVisualStatLabel}>Resources</span>
            </div>
            <div className={styles.authVisualStat}>
              <span className={styles.authVisualStatNum}>50k+</span>
              <span className={styles.authVisualStatLabel}>Educators</span>
            </div>
            <div className={styles.authVisualStat}>
              <span className={styles.authVisualStatNum}>Free</span>
              <span className={styles.authVisualStatLabel}>To browse</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.authForm}>
        <div className={styles.authFormInner}>
          <h1 className={styles.authTitle}>Welcome back</h1>
          <p className={styles.authSubtitle}>Sign in to access your resources.</p>

          {apiError && (
            <div className={styles.alertError} role="alert">
              <FaExclamationCircle className={styles.alertIcon} aria-hidden="true" />
              {apiError}
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <FormField id="email" label="Email address" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} error={errors.email}
              autoComplete="email" placeholder="you@example.com" required disabled={isBusy} />
            <FormField id="password" label="Password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} error={errors.password}
              autoComplete="current-password" placeholder="Your password" required disabled={isBusy} />
            <div className={styles.submitBtn}>
              <Button type="submit" fullWidth size="lg" isLoading={loading} disabled={isBusy}>
                Sign In
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
              text="signin_with"
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
              Don't have an account? <Link to="/register">Create one free</Link>
            </p>
            <p className={styles.formLink}>
              <Link to="/forgot-password">Forgot your password?</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
