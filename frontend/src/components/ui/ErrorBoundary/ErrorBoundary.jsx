// src/components/ui/ErrorBoundary/ErrorBoundary.jsx
// React class component — required because error boundaries must be class-based.
// Catches JS errors anywhere in the child tree and shows a graceful fallback
// instead of blanking the entire page.
//
// Usage:
//   <ErrorBoundary>
//     <SomeComponent />
//   </ErrorBoundary>
//
//   <ErrorBoundary fallback={<p>Custom fallback</p>}>
//     <SomeComponent />
//   </ErrorBoundary>

import React from 'react';
import styles from './ErrorBoundary.module.css';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production you'd send this to an error tracking service (Sentry etc.)
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided by parent
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default friendly error UI
      return (
        <div className={styles.errorBox} role="alert">
          <div className={styles.icon} aria-hidden="true">⚠️</div>
          <h2 className={styles.title}>Something went wrong</h2>
          <p className={styles.message}>
            This section encountered an unexpected error.
            {import.meta.env.DEV && this.state.error && (
              <span className={styles.devDetail}>
                {' '}({this.state.error.message})
              </span>
            )}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={this.handleReset}
            >
              Try again
            </button>
            <a href="/" className={styles.homeLink}>
              Go to homepage
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ── Convenience: page-level error boundary with full-screen fallback ─────────
export function PageErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={
        <div className={styles.pageError} role="alert">
          <div className={styles.pageErrorInner}>
            <div className={styles.pageErrorIcon} aria-hidden="true">😕</div>
            <h1 className={styles.pageErrorTitle}>This page ran into a problem</h1>
            <p className={styles.pageErrorMessage}>
              An unexpected error occurred. Try refreshing the page.
            </p>
            <div className={styles.pageErrorActions}>
              <button
                type="button"
                className={styles.pageErrorRefresh}
                onClick={() => window.location.reload()}
              >
                Refresh page
              </button>
              <a href="/" className={styles.pageErrorHome}>
                Go to homepage
              </a>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
