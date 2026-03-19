// src/pages/Orders/OrderDetail.jsx
// GET /api/orders/:order_number/

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaArrowLeft, FaMapMarkerAlt } from 'react-icons/fa';

import { getOrder }    from '../../api/orders';
import Spinner         from '../../components/ui/Spinner/Spinner';
import { formatNGN }   from '../../utils/formatCurrency';
import { formatDate }  from '../../utils/formatDate';
import styles from './Orders.module.css';
import SEO from '../../components/seo/SEO';

const STATUS_PILLS   = { pending: 'pillPending', processing: 'pillProcessing', shipped: 'pillShipped', delivered: 'pillDelivered', cancelled: 'pillCancelled' };
const PAYMENT_PILLS  = { unpaid: 'payUnpaid', paid: 'payPaid', refunded: 'payRefunded' };
const STATUS_LABELS  = { pending: 'Pending', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const PAYMENT_LABELS = { unpaid: 'Unpaid', paid: 'Paid', refunded: 'Refunded' };

export default function OrderDetail() {
  const { orderNumber } = useParams();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['orders', 'detail', orderNumber],
    queryFn:  () => getOrder(orderNumber),
    enabled:  Boolean(orderNumber),
    staleTime: 60 * 1000,
  });

  if (isLoading) return <div className={styles.page}><div className="container"><Spinner fullPage message="Loading order…" /></div></div>;
  if (isError || !order) return (
    <div className={styles.page}><div className="container">
      <div className={styles.error} role="alert">Order not found.</div>
      <Link to="/orders" className={styles.backLink}><FaArrowLeft aria-hidden="true" /> My Orders</Link>
    </div></div>
  );

  return (
    <div className={styles.page}>
      <SEO title={`Order #${order.order_number}`} noindex />

      <div className="container">
        <div className={styles.inner}>
          <Link to="/orders" className={styles.backLink}><FaArrowLeft aria-hidden="true" /> My Orders</Link>

          <header className={styles.detailHeader}>
            <div>
              <h1 className={styles.title}>Order #{order.order_number}</h1>
              <p className={styles.subtitle}>Placed {formatDate(order.created_at)}</p>
            </div>
            <div className={styles.statusBadges}>
              <span className={`${styles.pill} ${styles[STATUS_PILLS[order.status] || 'pillPending']}`}>
                {STATUS_LABELS[order.status] || order.status}
              </span>
              <span className={`${styles.pill} ${styles[PAYMENT_PILLS[order.payment_status] || 'payUnpaid']}`}>
                {PAYMENT_LABELS[order.payment_status] || order.payment_status}
              </span>
            </div>
          </header>

          <div className={styles.detailLayout}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Items</h2>
              <ul className={styles.detailItems}>
                {order.items?.map((item) => (
                  <li key={item.id} className={styles.detailItem}>
                    <div className={styles.detailItemInfo}>
                      <span className={styles.detailItemName}>{item.product_name}</span>
                      <span className={`${styles.typePill} ${item.product_type === 'digital' ? styles.typeDigital : styles.typePhysical}`}>
                        {item.product_type}
                      </span>
                    </div>
                    <span className={styles.detailItemQty}>× {item.quantity}</span>
                    <span className={styles.detailItemTotal}>{formatNGN(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.orderTotalRow}>
                <span>Total</span>
                <strong>{formatNGN(order.total_amount)}</strong>
              </div>
            </section>

            {order.shipping_address && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}><FaMapMarkerAlt aria-hidden="true" /> Delivery Address</h2>
                <div className={styles.addrBlock}>
                  <p>{order.shipping_address.recipient_name}</p>
                  <p>{order.shipping_address.address_line1}</p>
                  {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                  <p>{order.shipping_address.city}{order.shipping_address.state_province_county ? `, ${order.shipping_address.state_province_county}` : ''}</p>
                  <p>{order.shipping_address.country}</p>
                  {order.shipping_address.phone_number && <p>{order.shipping_address.phone_number}</p>}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
