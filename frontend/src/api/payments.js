// src/api/payments.js
// Paystack payment flow:
//   1. POST to initialize → receive { authorization_url, reference }
//   2. Redirect user to authorization_url
//   3. On return to /payment-success, poll the relevant status endpoint
//      to confirm payment (webhook fires asynchronously server-side)

import apiClient from './client';

/** POST /api/payment/paystack/initialize/
 *  Initialises an order payment.
 *  @param {{ order_number: string }} data
 *  @returns {{ authorization_url: string, reference: string }}
 */
export const initializeOrderPayment = (orderNumber) =>
  apiClient
    .post('/payment/paystack/initialize/', { order_number: orderNumber })
    .then((r) => r.data);

/** POST /api/payment/paystack/subscribe/
 *  Initialises a subscription payment.
 *  @param {{ plan_id: number }} data
 *  @returns {{ authorization_url: string, reference: string }}
 */
export const initializeSubscriptionPayment = (planId) =>
  apiClient
    .post('/payment/paystack/subscribe/', { plan_id: planId })
    .then((r) => r.data);
