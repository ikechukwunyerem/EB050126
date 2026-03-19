// src/pages/Cart/CartPage.jsx
// GET/PATCH/DELETE /api/cart/
// Works for guests and authenticated users.
// PATCH quantity=0 removes the item (backend convention).

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTrashAlt, FaShoppingBag, FaArrowRight } from 'react-icons/fa';

import { getCart, updateCartItem, removeFromCart } from '../../api/cart';
import { useCartStore }   from '../../store/cartStore';
import { useAuthStore }   from '../../store/authStore';
import { toast }          from '../../components/ui/Toast/Toast';
import Spinner            from '../../components/ui/Spinner/Spinner';
import Button             from '../../components/ui/Button/Button';
import { formatNGN }      from '../../utils/formatCurrency';
import styles from './CartPage.module.css';
import SEO from '../../components/seo/SEO';

const MAX_QTY = 99;

export default function CartPage() {
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const { setCart } = useCartStore();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn:  getCart,
    staleTime: 30 * 1000,
    onSuccess: (d) => setCart(d),
  });

  const _onSuccess = (data) => { setCart(data); qc.setQueryData(['cart'], data); };

  const updateMutation = useMutation({
    mutationFn: ({ cartItemId, quantity }) => updateCartItem(cartItemId, quantity),
    onSuccess: _onSuccess,
    onError: () => toast.error('Could not update cart.'),
  });

  const removeMutation = useMutation({
    mutationFn: (cartItemId) => removeFromCart(cartItemId),
    onSuccess: _onSuccess,
    onError: () => toast.error('Could not remove item.'),
  });

  const items      = cart?.items        || [];
  const grandTotal = cart?.grand_total  || '0.00';
  const isEmpty    = items.length === 0;

  const handleQtyChange = (cartItemId, newQty) => {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty < 0) return;
    if (qty === 0) {
      removeMutation.mutate(cartItemId);
    } else {
      updateMutation.mutate({ cartItemId, quantity: Math.min(qty, MAX_QTY) });
    }
  };

  const handleCheckout = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    navigate('/checkout');
  };

  if (isLoading) return (
    <div className={styles.page}>
      <SEO
        title="Your Cart"
        description="Review your cart and proceed to checkout."
        noindex
      />
<div className="container"><Spinner fullPage message="Loading cart…" /></div></div>
  );

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Your Cart</h1>

        {isEmpty ? (
          <div className={styles.empty}>
            <FaShoppingBag className={styles.emptyIcon} aria-hidden="true" />
            <h2 className={styles.emptyTitle}>Your cart is empty</h2>
            <p className={styles.emptyText}>Add some products or resources to get started.</p>
            <div className={styles.emptyActions}>
              <Link to="/products" className={styles.emptyBtn}>Browse Products</Link>
              <Link to="/resources" className={`${styles.emptyBtn} ${styles.emptyBtnOutline}`}>Browse Resources</Link>
            </div>
          </div>
        ) : (
          <div className={styles.layout}>

            {/* Items list */}
            <section className={styles.itemsCol}>
              <ul className={styles.itemList}>
                {items.map((item) => (
                  <li key={item.id} className={styles.item}>
                    {/* Thumb placeholder */}
                    <div className={styles.itemThumb} aria-hidden="true">
                      <FaShoppingBag />
                    </div>

                    <div className={styles.itemInfo}>
                      <p className={styles.itemName}>{item.product_name}</p>
                      <p className={styles.itemPrice}>{formatNGN(item.product_price)} each</p>
                      {item.product_type === 'digital' && (
                        <span className={styles.digitalTag}>Digital</span>
                      )}
                    </div>

                    <div className={styles.itemControls}>
                      {item.product_type !== 'digital' ? (
                        <div className={styles.qtyControl}>
                          <button type="button" className={styles.qtyBtn}
                            onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                            disabled={updateMutation.isPending || removeMutation.isPending}
                            aria-label="Decrease quantity">−</button>
                          <span className={styles.qtyNum}>{item.quantity}</span>
                          <button type="button" className={styles.qtyBtn}
                            onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                            disabled={item.quantity >= MAX_QTY || updateMutation.isPending}
                            aria-label="Increase quantity">+</button>
                        </div>
                      ) : (
                        <span className={styles.qtyFixed}>Qty: 1</span>
                      )}
                    </div>

                    <div className={styles.itemSubtotal}>
                      <span className={styles.subtotalAmount}>
                        {formatNGN(item.subtotal ?? parseFloat(item.product_price) * item.quantity)}
                      </span>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeMutation.mutate(item.id)}
                        disabled={removeMutation.isPending}
                        aria-label={`Remove ${item.product_name}`}
                      >
                        <FaTrashAlt aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Summary */}
            <aside className={styles.summaryCol}>
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>Order Summary</h2>
                <div className={styles.summaryRow}>
                  <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                  <span>{formatNGN(grandTotal)}</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                  <span>Total</span>
                  <strong>{formatNGN(grandTotal)}</strong>
                </div>

                <Button
                  fullWidth
                  size="lg"
                  rightIcon={<FaArrowRight />}
                  onClick={handleCheckout}
                  style={{ marginTop: 'var(--space-2)' }}
                >
                  {isLoggedIn ? 'Proceed to Checkout' : 'Sign In to Checkout'}
                </Button>

                <Link to="/products" className={styles.continueShopping}>
                  Continue Shopping
                </Link>
              </div>
            </aside>

          </div>
        )}
      </div>
    </div>
  );
}
