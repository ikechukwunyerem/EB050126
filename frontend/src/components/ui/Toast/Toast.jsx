// src/components/ui/Toast/Toast.jsx
// Lightweight toast notification system.
// Usage: import { toast } from './Toast'
// toast.success('Saved!') | toast.error('Failed.') | toast.info('Note') | toast.warning('Watch out')

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import styles from './Toast.module.css';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ToastContext = createContext(null);

let _externalPush = null; // allows toast.success() outside of React tree

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const push = useCallback(({ type = 'info', message, duration = 3500 }) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, type, message, exiting: false }]);

    setTimeout(() => {
      // Mark as exiting to trigger slide-out animation
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      // Remove after animation completes
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  // Expose push externally for use outside React components
  _externalPush = push;

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className={styles.toastContainer} role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Single toast item
// ---------------------------------------------------------------------------
const ICONS = {
  success: <FaCheckCircle   aria-hidden="true" />,
  error:   <FaExclamationCircle aria-hidden="true" />,
  warning: <FaExclamationTriangle aria-hidden="true" />,
  info:    <FaInfoCircle    aria-hidden="true" />,
};

function ToastItem({ toast, onDismiss }) {
  return (
    <div
      className={`${styles.toast} ${styles[toast.type]} ${toast.exiting ? styles.exiting : ''}`}
      role="alert"
    >
      <span className={styles.icon}>{ICONS[toast.type]}</span>
      <span className={styles.message}>{toast.message}</span>
      <button
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <FaTimes aria-hidden="true" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.push;
}

// ---------------------------------------------------------------------------
// Imperative API — usable outside React components (e.g. in api/ files)
// ---------------------------------------------------------------------------
export const toast = {
  success: (message, options) => _externalPush?.({ type: 'success', message, ...options }),
  error:   (message, options) => _externalPush?.({ type: 'error',   message, ...options }),
  warning: (message, options) => _externalPush?.({ type: 'warning', message, ...options }),
  info:    (message, options) => _externalPush?.({ type: 'info',    message, ...options }),
};
