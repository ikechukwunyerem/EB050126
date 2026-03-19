// src/store/cartStore.js
// Cart state mirrors the server exactly.
// Every mutation (add/update/remove) returns the full updated cart from the API —
// we simply replace the local state with that response. No optimistic updates.
// This keeps the store simple and avoids stale-state bugs.

import { create } from 'zustand';

const EMPTY_CART = {
  id: null,
  items: [],
  total_items: 0,
  grand_total: '0.00',
};

export const useCartStore = create((set, get) => ({
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  ...EMPTY_CART,
  isLoading: false,
  error: null,

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------
  itemCount: () => get().total_items ?? 0,
  subtotal:  () => parseFloat(get().grand_total ?? '0'),

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  /** Replace entire cart state from an API response object */
  setCart: (cartData) => {
    if (!cartData) {
      set(EMPTY_CART);
      return;
    }
    set({
      id:           cartData.id,
      items:        cartData.items        ?? [],
      total_items:  cartData.total_items  ?? 0,
      grand_total:  cartData.grand_total  ?? '0.00',
      error:        null,
    });
  },

  /** Clear cart after successful checkout / logout */
  clearCart: () => set({ ...EMPTY_CART }),

  setLoading: (val) => set({ isLoading: val }),
  setError:   (msg) => set({ error: msg }),
}));
