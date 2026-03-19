// src/store/authStore.js
// Manages JWT tokens + user identity in Zustand.
// Server state (subscription status, profile) lives in TanStack Query — not here.
// This store only holds what must survive a page refresh (tokens) and
// what is needed synchronously without an async fetch (basic user identity).

import { create } from 'zustand';
import { tokenStorage } from '../api/client';

// Hydrate initial state from localStorage on module load
function _getInitialState() {
  const token = tokenStorage.getAccess();
  const raw   = localStorage.getItem('efiko_user');
  let user    = null;
  try {
    user = raw ? JSON.parse(raw) : null;
  } catch {
    user = null;
  }
  return { token, user };
}

const { token: _initToken, user: _initUser } = _getInitialState();

export const useAuthStore = create((set, get) => ({
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  accessToken: _initToken,
  // user shape from login response:
  // { id, email, first_name, last_name, full_name, username }
  user: _initUser,

  // -----------------------------------------------------------------------
  // Derived helpers (call as functions)
  // -----------------------------------------------------------------------
  isLoggedIn: () => Boolean(get().accessToken && get().user),

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  /** Called after successful login or Google auth */
  setAuth: (accessToken, refreshToken, user) => {
    tokenStorage.setTokens(accessToken, refreshToken);
    localStorage.setItem('efiko_user', JSON.stringify(user));
    set({ accessToken, user });
  },

  /** Called on logout or when refresh token is invalid */
  clearAuth: () => {
    tokenStorage.clearTokens();
    localStorage.removeItem('efiko_user');
    set({ accessToken: null, user: null });
  },

  /** Update the locally stored user object (e.g. after profile edit) */
  updateUser: (updates) => {
    const updated = { ...get().user, ...updates };
    localStorage.setItem('efiko_user', JSON.stringify(updated));
    set({ user: updated });
  },
}));

// ---------------------------------------------------------------------------
// Listen for the 'efiko:logout' event dispatched by the Axios interceptor
// when a token refresh fails. This keeps the store in sync even when the
// logout originates from a network layer, not user action.
// ---------------------------------------------------------------------------
window.addEventListener('efiko:logout', () => {
  useAuthStore.getState().clearAuth();
});
