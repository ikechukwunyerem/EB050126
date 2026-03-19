// src/api/orders.js
import apiClient from './client';

/** POST /api/orders/checkout/
 *  @param {{ address_id?: number }} data
 *  @returns Order
 */
export const checkout = (addressId) =>
  apiClient.post('/orders/checkout/', { address_id: addressId }).then((r) => r.data);

/** GET /api/orders/ */
export const getOrders = (params = {}) =>
  apiClient.get('/orders/', { params }).then((r) => r.data);

/** GET /api/orders/<order_number>/ */
export const getOrder = (orderNumber) =>
  apiClient.get(`/orders/${orderNumber}/`).then((r) => r.data);
