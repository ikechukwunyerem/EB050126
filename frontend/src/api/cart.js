// src/api/cart.js
// Cart uses a single /api/cart/ endpoint for all operations.
// GET returns empty shape { id: null, items: [], total_items: 0, grand_total: "0.00" }
// when no cart exists — never a 404.
// PATCH / DELETE send the item id in the request body (non-standard, by design).

import apiClient from './client';

/** GET /api/cart/ */
export const getCart = () =>
  apiClient.get('/cart/').then((r) => r.data);

/** POST /api/cart/ — add item
 *  @param {{ product_id: number, quantity?: number }} data
 */
export const addToCart = (productId, quantity = 1) =>
  apiClient.post('/cart/', { product_id: productId, quantity }).then((r) => r.data);

/** PATCH /api/cart/ — set exact quantity (quantity=0 removes item)
 *  @param {{ cart_item_id: number, quantity: number }} data
 */
export const updateCartItem = (cartItemId, quantity) =>
  apiClient.patch('/cart/', { cart_item_id: cartItemId, quantity }).then((r) => r.data);

/** DELETE /api/cart/ — remove item entirely
 *  @param {number} cartItemId
 */
export const removeFromCart = (cartItemId) =>
  apiClient.delete('/cart/', { data: { cart_item_id: cartItemId } }).then((r) => r.data);
