// src/pages/Subscriptions/PricingPage.jsx
// GET  /api/subscriptions/plans/   → plans with nested prices
// GET  /api/subscriptions/my-status/ → current subscription state
// POST /api/payment/paystack/subscribe/ → { authorization_url, reference }
// On success → window.location.href = authorization_url (Paystack hosted page)

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FaCheck, FaLock, FaCrown, FaSpinner } from 'react-icons/fa';

import { getPlans }                    from '../../api/subscriptions';
import { initializeSubscriptionPayment } from '../../api/payments';
import { useAuthStore }                from '../../store/authStore';
import useSubscriptionStatus           from '../../hooks/useSubscriptionStatus';
import { toast }                       from '../../components/ui/Toast/Toast';
import { formatNGN }                   from '../../utils/formatCurrency';
import { formatDate }                  from '../../utils/formatDate';
import styles from './PricingPage.module.css';
import SEO from '../../components/seo/SEO';

// Features shown on every plan card — matched against plan slugs/names
// where the backend doesn't return feature lists
const PLAN_FEATURES = [
  'Unlimited resource downloads',
  'Access to all premium worksheets',
  'Lesson plans for all subjects',
  'Printable and digital formats',
  'New resources added weekly',
  'Cancel anytime',
];

const FREE_FEATURES = [
  'Browse the full resource library',
  'Download free-tagged resources',
  'Save resources to your list',
  'Access blog and articles',
];

export default function PricingPage() {
  const navigate   = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const { isValid, status, daysRemaining, plan: currentPlan } = useSubscriptionStatus();

  const [initiatingPlanId, setInitiatingPlanId] = useState(null);

  // Fetch plans
  const { data: plans = [], isLoading, isError } = useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn:  getPlans,
    staleTime: 10 * 60 * 1000,
  });

  // Paystack initialisation mutation
  const subscribeMutation = useMutation({
    mutationFn: (planId) => initializeSubscriptionPayment(planId),
    onSuccess: (data) => {
      // Redirect to Paystack hosted payment page
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error('Could not initiate payment. Please try again.');
        setInitiatingPlanId(null);
      }
    },
    onError: (err) => {
      const msg = err?.response?.data?.error
        || err?.response?.data?.detail
        || 'Could not initiate payment. Please try again.';
      toast.error(msg);
      setInitiatingPlanId(null);
    },
  });

  const handleSubscribe = (planId) => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: '/pricing' } } });
      return;
    }
    if (isValid) {
      toast.info('You already have an active subscription.');
      return;
    }
    setInitiatingPlanId(planId);
    subscribeMutation.mutate(planId);
  };

  // Find NGN price for a plan
  const getNGNPrice = (plan) => {
    const price = plan.prices?.find((p) => p.currency === 'NGN');
    return price ? parseFloat(price.amount) : null;
  };

  return (
    <div className={styles.page}>
      <SEO
        title="Pricing"
        description="Simple, honest pricing for unlimited access to all Efiko teaching resources. Subscribe monthly or annually."
      />

      <div className="container">

        {/* ── Hero ── */}
        <header className={styles.header}>
          <h1 className={styles.title}>Simple, honest pricing</h1>
          <p className={styles.subtitle}>
            Start free. Upgrade when you need unlimited access.
          </p>
        </header>

        {/* ── Active subscription banner ── */}
        {isLoggedIn && isValid && currentPlan && (
          <div className={styles.activeBanner}>
            <FaCrown className={styles.activeBannerIcon} aria-hidden="true" />
            <div>
              <strong>You have an active {currentPlan.name} subscription.</strong>
              {daysRemaining > 0 && (
                <span className={styles.activeBannerDays}>
                  {' '}{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining.
                </span>
              )}
            </div>
            <Link to="/subscriptions" className={styles.activeBannerLink}>
              Manage subscription
            </Link>
          </div>
        )}

        {/* ── Plan grid ── */}
        {isLoading ? (
          <PlanGridSkeleton />
        ) : isError ? (
          <div className={styles.errorBanner} role="alert">
            Failed to load pricing plans. Please refresh the page.
          </div>
        ) : (
          <div className={styles.planGrid}>
            {/* Free plan — always shown first */}
            <FreePlanCard isLoggedIn={isLoggedIn} />

            {/* Paid plans from API */}
            {plans.map((plan, index) => {
              const ngnPrice     = getNGNPrice(plan);
              const isInitiating = initiatingPlanId === plan.id;
              const isPopular    = index === 0; // First paid plan is "most popular"

              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  ngnPrice={ngnPrice}
                  isPopular={isPopular}
                  isCurrentPlan={isValid && currentPlan?.slug === plan.slug}
                  isInitiating={isInitiating}
                  isLoggedIn={isLoggedIn}
                  onSubscribe={() => handleSubscribe(plan.id)}
                />
              );
            })}
          </div>
        )}

        {/* ── FAQ / guarantee ── */}
        <div className={styles.guarantee}>
          <FaLock className={styles.guaranteeIcon} aria-hidden="true" />
          <p>
            All payments are processed securely by Paystack.
            You can cancel your subscription at any time from your account settings.
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Free plan card ────────────────────────────────────────────────────────────
function FreePlanCard({ isLoggedIn }) {
  return (
    <div className={styles.planCard}>
      <div className={styles.planHeader}>
        <h2 className={styles.planName}>Free</h2>
        <div className={styles.planPriceRow}>
          <span className={styles.planPrice}>₦0</span>
          <span className={styles.planPeriod}>forever</span>
        </div>
        <p className={styles.planDesc}>Everything you need to get started.</p>
      </div>

      <ul className={styles.featureList}>
        {FREE_FEATURES.map((f) => (
          <li key={f} className={styles.featureItem}>
            <FaCheck className={styles.featureIcon} aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>

      <div className={styles.planCta}>
        {isLoggedIn ? (
          <Link to="/resources" className={`${styles.ctaBtn} ${styles.ctaBtnOutline}`}>
            Browse Free Resources
          </Link>
        ) : (
          <Link to="/register" className={`${styles.ctaBtn} ${styles.ctaBtnOutline}`}>
            Sign Up Free
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Paid plan card ────────────────────────────────────────────────────────────
function PlanCard({ plan, ngnPrice, isPopular, isCurrentPlan, isInitiating, isLoggedIn, onSubscribe }) {
  return (
    <div className={`${styles.planCard} ${isPopular ? styles.planCardFeatured : ''}`}>
      {isPopular && (
        <div className={styles.popularBadge}>
          <FaCrown aria-hidden="true" /> Most Popular
        </div>
      )}

      <div className={styles.planHeader}>
        <h2 className={styles.planName}>{plan.name}</h2>
        <div className={styles.planPriceRow}>
          {ngnPrice !== null ? (
            <>
              <span className={styles.planPrice}>{formatNGN(ngnPrice)}</span>
              <span className={styles.planPeriod}>
                / {plan.duration_days === 30 ? 'month'
                  : plan.duration_days === 365 ? 'year'
                  : `${plan.duration_days} days`}
              </span>
            </>
          ) : (
            <span className={styles.planPrice}>—</span>
          )}
        </div>
        {plan.description && (
          <p className={styles.planDesc}>{plan.description}</p>
        )}
      </div>

      <ul className={styles.featureList}>
        {PLAN_FEATURES.map((f) => (
          <li key={f} className={styles.featureItem}>
            <FaCheck className={`${styles.featureIcon} ${styles.featureIconPrimary}`} aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>

      <div className={styles.planCta}>
        {isCurrentPlan ? (
          <Link to="/subscriptions" className={`${styles.ctaBtn} ${styles.ctaBtnSuccess}`}>
            <FaCheck aria-hidden="true" /> Current Plan
          </Link>
        ) : (
          <button
            type="button"
            className={`${styles.ctaBtn} ${isPopular ? styles.ctaBtnPrimary : styles.ctaBtnOutline}`}
            onClick={onSubscribe}
            disabled={isInitiating}
          >
            {isInitiating ? (
              <><FaSpinner className={styles.spinnerIcon} aria-hidden="true" /> Redirecting…</>
            ) : isLoggedIn ? (
              `Subscribe — ${ngnPrice !== null ? formatNGN(ngnPrice) : 'N/A'}`
            ) : (
              'Get Started'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function PlanGridSkeleton() {
  return (
    <div className={styles.planGrid}>
      {[...Array(3)].map((_, i) => (
        <div key={i} className={styles.planCard}>
          <div className={`skeleton ${styles.skelTitle}`} />
          <div className={`skeleton ${styles.skelPrice}`} />
          <div className={`skeleton ${styles.skelDesc}`} />
          {[...Array(5)].map((__, j) => (
            <div key={j} className={`skeleton ${styles.skelFeature}`} />
          ))}
          <div className={`skeleton ${styles.skelBtn}`} />
        </div>
      ))}
    </div>
  );
}
