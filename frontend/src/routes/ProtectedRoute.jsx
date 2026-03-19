// src/routes/ProtectedRoute.jsx
// Wraps routes that require authentication.
// Saves the attempted URL so the user is redirected back after login.

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * @param {ReactNode} children
 * @param {string}    [redirectTo='/login']  — where to send unauthenticated users
 */
export default function ProtectedRoute({ children, redirectTo = '/login' }) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn());
  const location   = useLocation();

  if (!isLoggedIn) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}
