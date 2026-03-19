// src/pages/Orders/OrderHistory.jsx
// GET /api/orders/

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaBox, FaArrowRight } from 'react-icons/fa';

import { getOrders }     from '../../api/orders';
import Spinner           from '../../components/ui/Spinner/Spinner';
import Pagination        from '../../components/ui/Pagination/Pagination';
import { formatNGN }     from '../../utils/formatCurrency';
import { formatDate }    from '../../utils/formatDate';
import styles from './Orders.module.css';
import SEO from '../../components/seo/SEO';

const STATUS_PILLS = {
  pending:    { label: 'Pending',    cls: 'pillPending'    },
  processing: { label: 'Processing', cls: 'pillProcessing' },
  shipped:    { label: 'Shipped',    cls: 'pillShipped'    },
  delivered:  { label: 'Delivered',  cls: 'pillDelivered'  },
  cancelled:  { label: 'Cancelled',  cls: 'pillCancelled'  },
};

const PAYMENT_PILLS = {
  unpaid:   { label: 'Unpaid',   cls: 'payUnpaid'   },
  paid:     { label: 'Paid',     cls: 'payPaid'     },
  refunded: { label: 'Refunded', cls: 'payRefunded' },
};

export default function OrderHistory() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders', 'list', page],
    queryFn:  () => getOrders({ page }),
    staleTime: 60 * 1000,
  });

  const orders = data?.results || [];
  const total  = data?.count   || 0;

  return (
    <div className={styles.page}>
      <SEO
        title="My Orders"
        description="View your Efiko Education order history."
        noindex
      />

      <div className="container">
        <div className={styles.inner}>
          <header className={styles.header}>
            <h1 className={styles.title}>My Orders</h1>
            <p className={styles.subtitle}>Your purchase history.</p>
          </header>

          {isLoading ? <Spinner fullPage message="Loading orders…" /> : isError ? (
            <div className={styles.error} role="alert">Failed to load orders.</div>
          ) : orders.length === 0 ? (
            <div className={styles.empty}>
              <FaBox className={styles.emptyIcon} aria-hidden="true" />
              <h3>No orders yet</h3>
              <p>Your completed purchases will appear here.</p>
              <Link to="/products" className={styles.emptyLink}>Browse Shop <FaArrowRight aria-hidden="true" /></Link>
            </div>
          ) : (
            <>
              <div className={styles.orderList}>
                {orders.map((order) => {
                  const sp = STATUS_PILLS[order.status]         || { label: order.status,         cls: 'pillPending'  };
                  const pp = PAYMENT_PILLS[order.payment_status] || { label: order.payment_status, cls: 'payUnpaid' };
                  return (
                    <Link key={order.id} to={`/orders/${order.order_number}`} className={styles.orderRow}>
                      <div className={styles.orderLeft}>
                        <span className={styles.orderNum}>#{order.order_number}</span>
                        <span className={styles.orderDate}>{formatDate(order.created_at)}</span>
                      </div>
                      <div className={styles.orderMiddle}>
                        <span className={`${styles.pill} ${styles[sp.cls]}`}>{sp.label}</span>
                        <span className={`${styles.pill} ${styles[pp.cls]}`}>{pp.label}</span>
                      </div>
                      <div className={styles.orderRight}>
                        <span className={styles.orderTotal}>{formatNGN(order.total_amount)}</span>
                        <FaArrowRight className={styles.orderArrow} aria-hidden="true" />
                      </div>
                    </Link>
                  );
                })}
              </div>
              {total > 10 && <Pagination count={total} page={page} pageSize={10} onPageChange={setPage} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
