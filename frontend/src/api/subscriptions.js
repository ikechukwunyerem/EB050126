// src/api/subscriptions.js
import apiClient from './client';

/** GET /api/subscriptions/plans/
 *  Public. Returns all active plans with nested prices.
 */
export const getPlans = () =>
  apiClient.get('/subscriptions/plans/').then((r) => r.data);

/** GET /api/subscriptions/my-status/
 *  Always returns consistent shape. is_valid: false when no subscription.
 *  @returns {{ id, plan, status, is_valid, days_remaining, current_period_end, ... }}
 */
export const getMySubscriptionStatus = () =>
  apiClient.get('/subscriptions/my-status/').then((r) => r.data);

/** GET /api/subscriptions/history/ */
export const getSubscriptionHistory = (params = {}) =>
  apiClient.get('/subscriptions/history/', { params }).then((r) => r.data);
