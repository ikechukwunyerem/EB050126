// src/components/layout/MainMenu/CartPanel.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaTimes, FaTrashAlt, FaShoppingCart } from 'react-icons/fa';
import { useCartStore } from '../../../store/cartStore';
import useCart from '../../../hooks/useCart';
import { formatNGN } from '../../../utils/formatCurrency';
import styles from './MainMenu.module.css';

export default function CartPanel({ onClose }) {
  const items      = useCartStore((s) => s.items);
  const grandTotal = useCartStore((s) => s.grand_total);
  const { removeItem } = useCart();

  return (
    <div className={styles.cartPanel}>
      <div className={styles.cartPanelHeader}>
        <h3 className={styles.cartPanelTitle}>
          <FaShoppingCart aria-hidden="true" />
          Your Cart
          {items.length > 0 && (
            <span className={styles.cartPanelCount}>{items.length}</span>
          )}
        </h3>
        <button
          type="button"
          className={styles.cartCloseBtn}
          onClick={onClose}
          aria-label="Close cart"
        >
          <FaTimes aria-hidden="true" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className={styles.cartEmpty}>
          <FaShoppingCart className={styles.cartEmptyIcon} aria-hidden="true" />
          <p>Your cart is empty</p>
          <Link to="/resources" className={styles.cartEmptyLink} onClick={onClose}>
            Browse Resources
          </Link>
        </div>
      ) : (
        <>
          <ul className={styles.cartItemList}>
            {items.map((item) => (
              <li key={item.id} className={styles.cartItem}>
                <div className={styles.cartItemInfo}>
                  <Link
                    to={`/products/${item.product_slug || item.product}`}
                    className={styles.cartItemName}
                    onClick={onClose}
                  >
                    {item.product_name}
                  </Link>
                  <span className={styles.cartItemMeta}>
                    {item.quantity} × {formatNGN(item.product_price)}
                  </span>
                </div>
                <div className={styles.cartItemRight}>
                  <span className={styles.cartItemSubtotal}>
                    {formatNGN(item.subtotal ?? item.quantity * parseFloat(item.product_price))}
                  </span>
                  <button
                    type="button"
                    className={styles.cartItemRemove}
                    onClick={() => removeItem.mutate({ cartItemId: item.id })}
                    aria-label={`Remove ${item.product_name} from cart`}
                    disabled={removeItem.isPending}
                  >
                    <FaTrashAlt aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.cartFooter}>
            <div className={styles.cartTotal}>
              <span>Subtotal</span>
              <strong>{formatNGN(grandTotal)}</strong>
            </div>
            <Link
              to="/cart"
              className={styles.cartActionBtn}
              onClick={onClose}
            >
              View Cart
            </Link>
            <Link
              to="/checkout"
              className={`${styles.cartActionBtn} ${styles.cartCheckoutBtn}`}
              onClick={onClose}
            >
              Checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
