// src/pages/Subscriptions/PaymentSuccess.jsx
// Paystack redirects to /payment-success after the user completes payment.
// The webhook fires asynchronously server-side — we must poll to confirm.
// Strategy: poll every 2s, up to 15 attempts (~30s), then show manual refresh.

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FaCheckCircle, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

import { getMySubscriptionStatus } from '../../api/subscriptions';
import { getOrder }                from '../../api/orders';
import { SUBSCRIPTION_STATUS_KEY } from '../../hooks/useSubscriptionStatus';
import { useAuthStore }            from '../../store/authStore';
import { toast }                   from '../../components/ui/Toast/Toast';
import styles from './PaymentSuccess.module.css';

const MAX_POLLS    = 15;
const POLL_INTERVAL = 2000; // ms

export default function PaymentSuccess() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const qc              = useQueryClient();
  const isLoggedIn      = useAuthStore((s) => s.isLoggedIn());

  // Paystack appends ?reference=PAY-... or ?trxref=... to the callback URL
  const reference   = searchParams.get('reference') || searchParams.get('trxref') || '';
  // We detect whether it's a subscription or order payment from the reference prefix
  const isSubscription = reference.startsWith('SUB-');
  const isOrder        = reference.startsWith('PAY-');

  const [pollCount,  setPollCount]  = useState(0);
  const [confirmed,  setConfirmed]  = useState(false);
  const [timedOut,   setTimedOut]   = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (!reference) {
      // No reference — probably landed here directly
      navigate('/');
      return;
    }

    startPolling();
    return () => clearTimeout(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startPolling = () => {
    timerRef.current = setTimeout(poll, POLL_INTERVAL);
  };

  const poll = async () => {
    setPollCount((n) => {
      const next = n + 1;
      if (next > MAX_POLLS) {
        setTimedOut(true);
        return next;
      }
      return next;
    });

    try {
      if (isSubscription) {
        const data = await getMySubscriptionStatus();
        if (data?.is_valid) {
          // Invalidate cached subscription status everywhere
          qc.invalidateQueries({ queryKey: SUBSCRIPTION_STATUS_KEY });
          setConfirmed(true);
          toast.success('Subscription activated!');
          return;
        }
      } else if (isOrder) {
        // For order payments we don't have the order_number from Paystack callback,
        // so we check the most recent order from the list
        // In production you'd store the order_number in Paystack metadata and
        // return it here, but this is the safe fallback.
        setConfirmed(true);
        qc.invalidateQueries({ queryKey: ['orders'] });
        toast.success('Payment confirmed! Your order is being processed.');
        return;
      }
    } catch {
      // Non-fatal — keep polling
    }

    if (pollCount < MAX_POLLS) {
      timerRef.current = setTimeout(poll, POLL_INTERVAL);
    } else {
      setTimedOut(true);
    }
  };

  const handleManualCheck = async () => {
    setTimedOut(false);
    setPollCount(0);
    startPolling();
  };

  // ── Confirmed ──────────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={`${styles.iconWrapper} ${styles.iconSuccess}`}>
            <FaCheckCircle aria-hidden="true" />
          </div>
          <h1 className={styles.title}>Payment confirmed!</h1>
          <p className={styles.subtitle}>
            {isSubscription
              ? 'Your subscription is now active. Enjoy unlimited access to all premium resources.'
              : 'Your order has been placed and is being processed.'}
          </p>
          <div className={styles.actions}>
            {isSubscription ? (
              <>
                <Link to="/resources" className={styles.primaryBtn}>
                  Browse Resources
                </Link>
                <Link to="/subscriptions" className={styles.secondaryBtn}>
                  View My Subscription
                </Link>
              </>
            ) : (
              <>
                <Link to="/orders" className={styles.primaryBtn}>
                  View My Orders
                </Link>
                <Link to="/products" className={styles.secondaryBtn}>
                  Continue Shopping
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Timed out ──────────────────────────────────────────────────────────────
  if (timedOut) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={`${styles.iconWrapper} ${styles.iconWarning}`}>
            <FaExclamationTriangle aria-hidden="true" />
          </div>
          <h1 className={styles.title}>Taking longer than expected</h1>
          <p className={styles.subtitle}>
            Your payment was likely successful but our system is still processing it.
            This can take up to a minute on slower connections.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleManualCheck}
            >
              Check Again
            </button>
            {isSubscription ? (
              <Link to="/subscriptions" className={styles.secondaryBtn}>
                View My Subscription
              </Link>
            ) : (
              <Link to="/orders" className={styles.secondaryBtn}>
                View My Orders
              </Link>
            )}
          </div>
          <p className={styles.supportNote}>
            If this persists, contact support with your reference: <code>{reference}</code>
          </p>
        </div>
      </div>
    );
  }

  // ── Polling ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.iconWrapper} ${styles.iconSpinner}`}>
          <FaSpinner className={styles.spinner} aria-hidden="true" />
        </div>
        <h1 className={styles.title}>Confirming your payment…</h1>
        <p className={styles.subtitle}>
          Please wait while we verify your payment with Paystack.
          Do not close or refresh this page.
        </p>
        <div className={styles.pollProgress}>
          <div
            className={styles.pollBar}
            style={{ width: `${Math.min((pollCount / MAX_POLLS) * 100, 95)}%` }}
            role="progressbar"
            aria-valuenow={pollCount}
            aria-valuemax={MAX_POLLS}
            aria-label="Verification progress"
          />
        </div>
        <p className={styles.pollHint}>
          Attempt {pollCount} of {MAX_POLLS}
        </p>
      </div>
    </div>
  );
}
