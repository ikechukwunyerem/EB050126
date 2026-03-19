// src/api/client.js
// Axios instance with JWT Bearer auth and silent token refresh on 401.
// This is the only file that constructs the Axios instance.
// All other api/*.js files import this.

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ---------------------------------------------------------------------------
// Token storage helpers
// localStorage is the only viable option for header-based JWT in a SPA.
// Never store tokens in sessionStorage (cleared on tab close, breaks multi-tab)
// or in-memory only (lost on refresh, bad UX).
// ---------------------------------------------------------------------------

const TOKEN_KEY   = 'efiko_access';
const REFRESH_KEY = 'efiko_refresh';

export const tokenStorage = {
  getAccess:      ()      => localStorage.getItem(TOKEN_KEY),
  getRefresh:     ()      => localStorage.getItem(REFRESH_KEY),
  setTokens:      (access, refresh) => {
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clearTokens:    ()      => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // needed for Django session (guest cart)
});

// ---------------------------------------------------------------------------
// Request interceptor — attach access token to every request
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — silent token refresh on 401
//
// Flow:
//   1. Request fails with 401
//   2. Try POST /auth/token/refresh/ with the stored refresh token
//   3. If refresh succeeds → store new tokens, retry original request
//   4. If refresh fails (token expired/blacklisted) → clear tokens,
//      dispatch 'efiko:logout' event so AuthContext can react
//
// Guard: _isRefreshing prevents multiple simultaneous refresh calls.
// Queue: _failedQueue holds all requests that arrived while refresh is in
//        flight — they all retry once the new token is available.
// ---------------------------------------------------------------------------

let _isRefreshing = false;
let _failedQueue  = [];

function _processQueue(error, token = null) {
  _failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  _failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only intercept 401s that haven't already been retried
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/token/refresh/')
    ) {
      return Promise.reject(error);
    }

    if (_isRefreshing) {
      // Another refresh is already in flight — queue this request
      return new Promise((resolve, reject) => {
        _failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    _isRefreshing = true;

    const refreshToken = tokenStorage.getRefresh();

    if (!refreshToken) {
      _isRefreshing = false;
      tokenStorage.clearTokens();
      window.dispatchEvent(new Event('efiko:logout'));
      return Promise.reject(error);
    }

    try {
      // Use a raw axios call (not apiClient) to avoid interceptor loops
      const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
        refresh: refreshToken,
      });

      // ROTATE_REFRESH_TOKENS=True means we get a new refresh token too
      tokenStorage.setTokens(data.access, data.refresh || refreshToken);

      apiClient.defaults.headers.common.Authorization = `Bearer ${data.access}`;
      _processQueue(null, data.access);

      originalRequest.headers.Authorization = `Bearer ${data.access}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      _processQueue(refreshError, null);
      tokenStorage.clearTokens();
      window.dispatchEvent(new Event('efiko:logout'));
      return Promise.reject(refreshError);
    } finally {
      _isRefreshing = false;
    }
  }
);

export default apiClient;
