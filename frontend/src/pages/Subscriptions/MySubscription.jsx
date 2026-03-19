// src/pages/Subscriptions/MySubscription.jsx
// GET /api/subscriptions/my-status/  → consistent shape, is_valid bool
// GET /api/subscriptions/history/    → paginated history

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FaCrown, FaCheckCircle, FaTimesCircle,
  FaCalendarAlt, FaHistory, FaArrowRight,
} from 'react-icons/fa';

import { getMySubscriptionStatus, getSubscriptionHistory } from '../../api/subscriptions';
import { SUBSCRIPTION_STATUS_KEY } from '../../hooks/useSubscriptionStatus';
import Spinner    from '../../components/ui/Spinner/Spinner';
import Pagination from '../../components/ui/Pagination/Pagination';
import { formatDate } from '../../utils/formatDate';
import styles from './MySubscription.module.css';
import SEO from '../../components/seo/SEO';

export default function MySubscription() {
  const [historyPage, setHistoryPage] = useState(1);

  // Current status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: SUBSCRIPTION_STATUS_KEY,
    queryFn:  getMySubscriptionStatus,
    staleTime: 60 * 1000,
  });

  // History
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['subscriptions', 'history', historyPage],
    queryFn:  () => getSubscriptionHistory({ page: historyPage }),
    staleTime: 2 * 60 * 1000,
  });

  const history     = historyData?.results || [];
  const historyTotal = historyData?.count  || 0;

  const isActive    = status?.is_valid  ?? false;
  const daysLeft    = status?.days_remaining ?? 0;
  const planName    = status?.plan?.name ?? null;
  const periodEnd   = status?.current_period_end ?? null;
  const subStatus   = status?.status ?? 'none';

  return (
    <div className={styles.page}>
      <SEO
        title="My Subscription"
        description="Manage your Efiko Education subscription."
        noindex
      />

      <div className="container">
        <div className={styles.inner}>

          <header className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>My Subscription</h1>
            <p className={styles.pageSubtitle}>Manage your Efiko subscription.</p>
          </header>

          {/* ── Current status card ── */}
          {statusLoading ? (
            <Spinner size="md" />
          ) : (
            <div className={`${styles.statusCard} ${isActive ? styles.statusCardActive : styles.statusCardInactive}`}>
              <div className={styles.statusLeft}>
                <div className={`${styles.statusIcon} ${isActive ? styles.statusIconActive : ''}`}>
                  {isActive
                    ? <FaCrown    aria-hidden="true" />
                    : <FaTimesCircle aria-hidden="true" />
                  }
                </div>
                <div className={styles.statusInfo}>
                  <h2 className={styles.statusTitle}>
                    {isActive
                      ? `${planName || 'Premium'} — Active`
                      : subStatus === 'none'
                        ? 'No active subscription'
                        : `Subscription ${subStatus}`
                    }
                  </h2>
                  {isActive && (
                    <div className={styles.statusMeta}>
                      {daysLeft > 0 && (
                        <span className={styles.statusMetaItem}>
                          <FaCalendarAlt aria-hidden="true" />
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                        </span>
                      )}
                      {periodEnd && (
                        <span className={styles.statusMetaItem}>
                          Renews {formatDate(periodEnd)}
                        </span>
                      )}
                    </div>
                  )}
                  {!isActive && (
                    <p className={styles.statusDesc}>
                      Subscribe to unlock unlimited downloads and access all premium resources.
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.statusRight}>
                {isActive ? (
                  <div className={styles.activePill}>
                    <FaCheckCircle aria-hidden="true" /> Active
                  </div>
                ) : (
                  <Link to="/pricing" className={styles.upgradeBtn}>
                    Subscribe Now <FaArrowRight aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── Subscription history ── */}
          <section className={styles.historySection}>
            <h2 className={styles.sectionTitle}>
              <FaHistory aria-hidden="true" /> Subscription History
            </h2>

            {historyLoading ? (
              <Spinner size="md" />
            ) : history.length === 0 ? (
              <div className={styles.emptyHistory}>
                <p>No subscription history yet.</p>
                <Link to="/pricing" className={styles.emptyHistoryLink}>
                  View plans <FaArrowRight aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <>
                <div className={styles.historyTable}>
                  <div className={styles.historyHeader}>
                    <span>Plan</span>
                    <span>Status</span>
                    <span>Period</span>
                  </div>
                  {history.map((item) => (
                    <div key={item.id} className={styles.historyRow}>
                      <span className={styles.historyPlan}>
                        {item.plan_name || '—'}
                      </span>
                      <span>
                        <StatusPill status={item.status} isValid={item.is_valid} />
                      </span>
                      <span className={styles.historyPeriod}>
                        {item.current_period_start
                          ? formatDate(item.current_period_start)
                          : '—'}
                        {item.current_period_end && (
                          <> → {formatDate(item.current_period_end)}</>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {historyTotal > 10 && (
                  <Pagination
                    count={historyTotal}
                    page={historyPage}
                    pageSize={10}
                    onPageChange={setHistoryPage}
                  />
                )}
              </>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, isValid }) {
  const map = {
    active:    { label: 'Active',    cls: 'pillActive'    },
    expired:   { label: 'Expired',   cls: 'pillExpired'   },
    cancelled: { label: 'Cancelled', cls: 'pillCancelled' },
    none:      { label: 'None',      cls: 'pillNone'      },
  };
  const cfg = map[status] || map.none;
  return (
    <span className={`${styles.pill} ${styles[cfg.cls]}`}>
      {cfg.label}
    </span>
  );
}
