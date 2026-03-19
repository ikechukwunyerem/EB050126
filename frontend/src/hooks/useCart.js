// src/hooks/useCart.js
// Wraps all cart operations with TanStack Query mutations.
// The cart store (Zustand) is kept in sync by calling setCart()
// on every mutation's onSuccess callback.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, addToCart, updateCartItem, removeFromCart } from '../api/cart';
import { useCartStore } from '../store/cartStore';
import { toast } from '../components/ui/Toast/Toast';

export const CART_KEY = ['cart'];

export default function useCart() {
  const queryClient  = useQueryClient();
  const { setCart }  = useCartStore();

  // -----------------------------------------------------------------------
  // Fetch cart
  // -----------------------------------------------------------------------
  const cartQuery = useQuery({
    queryKey: CART_KEY,
    queryFn:  getCart,
    staleTime: 60 * 1000,  // 1 minute
    onSuccess: (data) => setCart(data),
  });

  // -----------------------------------------------------------------------
  // Sync query data → Zustand on every fetch
  // -----------------------------------------------------------------------
  if (cartQuery.data) {
    setCart(cartQuery.data);
  }

  // -----------------------------------------------------------------------
  // Mutations — all return the full updated cart from the server
  // -----------------------------------------------------------------------
  const _onMutationSuccess = (data) => {
    setCart(data);
    queryClient.setQueryData(CART_KEY, data);
  };

  const addItem = useMutation({
    mutationFn: ({ productId, quantity }) => addToCart(productId, quantity),
    onSuccess:  _onMutationSuccess,
    onError:    () => toast.error('Could not add item to cart.'),
  });

  const updateItem = useMutation({
    mutationFn: ({ cartItemId, quantity }) => updateCartItem(cartItemId, quantity),
    onSuccess:  _onMutationSuccess,
    onError:    () => toast.error('Could not update cart.'),
  });

  const removeItem = useMutation({
    mutationFn: ({ cartItemId }) => removeFromCart(cartItemId),
    onSuccess:  _onMutationSuccess,
    onError:    () => toast.error('Could not remove item.'),
  });

  return {
    cart:        cartQuery.data,
    isLoading:   cartQuery.isLoading,
    error:       cartQuery.error,
    addItem,
    updateItem,
    removeItem,
  };
}
