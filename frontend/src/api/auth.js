// src/api/auth.js
// All /api/auth/ endpoint calls.
// Returns raw response data — callers handle errors via TanStack Query.

import apiClient from './client';

/** POST /api/auth/register/
 *  @param {{ email, first_name, last_name, password }} data
 */
export const register = (data) =>
  apiClient.post('/auth/register/', data).then((r) => r.data);

/** POST /api/auth/login/
 *  @returns {{ access, refresh, user: { id, email, first_name, last_name, full_name, username } }}
 */
export const login = (email, password) =>
  apiClient.post('/auth/login/', { email, password }).then((r) => r.data);

/** POST /api/auth/google/
 *  @param {{ access_token: string }} credential from @react-oauth/google
 *  @returns {{ access, refresh, user }}
 */
/**
 * POST /api/auth/google/
 * Backend uses id_token.verify_oauth2_token() — requires a Google ID token
 * passed as the 'credential' field. This credential comes from the GoogleLogin
 * component's onSuccess callback, NOT from useGoogleLogin's access_token.
 */
export const googleLogin = (credential) =>
  apiClient.post('/auth/google/', { credential }).then((r) => r.data);

/** POST /api/auth/token/refresh/  (called automatically by the interceptor)  */
export const refreshToken = (refresh) =>
  apiClient.post('/auth/token/refresh/', { refresh }).then((r) => r.data);

/** GET /api/auth/verify-email/<uidb64>/<token>/  */
export const verifyEmail = (uidb64, token) =>
  apiClient.get(`/auth/verify-email/${uidb64}/${token}/`).then((r) => r.data);

/** POST /api/auth/resend-verification/  */
export const resendVerification = (email) =>
  apiClient.post('/auth/resend-verification/', { email }).then((r) => r.data);

/** POST /api/auth/password-reset/  */
export const requestPasswordReset = (email) =>
  apiClient.post('/auth/password-reset/', { email }).then((r) => r.data);

/** POST /api/auth/password-reset/<uidb64>/<token>/  */
export const confirmPasswordReset = (uidb64, token, password) =>
  apiClient
    .post(`/auth/password-reset/${uidb64}/${token}/`, { password })
    .then((r) => r.data);

/** GET /api/auth/profile/
 *  @returns {{ id, email, username, full_name, first_name, last_name, image, about, gender }}
 */
export const getProfile = () =>
  apiClient.get('/auth/profile/').then((r) => r.data);

/** PATCH /api/auth/profile/  */
export const updateProfile = (data) =>
  apiClient.patch('/auth/profile/', data).then((r) => r.data);

/** GET /api/auth/addresses/  */
export const getAddresses = () =>
  apiClient.get('/auth/addresses/').then((r) => r.data);

/** POST /api/auth/addresses/  */
export const createAddress = (data) =>
  apiClient.post('/auth/addresses/', data).then((r) => r.data);

/** PATCH /api/auth/addresses/<id>/  */
export const updateAddress = (id, data) =>
  apiClient.patch(`/auth/addresses/${id}/`, data).then((r) => r.data);

/** DELETE /api/auth/addresses/<id>/  */
export const deleteAddress = (id) =>
  apiClient.delete(`/auth/addresses/${id}/`).then((r) => r.data);
