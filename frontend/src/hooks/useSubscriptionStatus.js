// src/hooks/useSubscriptionStatus.js
// Wraps the subscription status query.
// Cached for 5 minutes — refetched on window focus.
// Used on every page that gates content behind a subscription.

import { useQuery } from '@tanstack/react-query';
import { getMySubscriptionStatus } from '../api/subscriptions';
import { useAuthStore } from '../store/authStore';

export const SUBSCRIPTION_STATUS_KEY = ['subscription', 'my-status'];

export default function useSubscriptionStatus() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn());

  const query = useQuery({
    queryKey: SUBSCRIPTION_STATUS_KEY,
    queryFn:  getMySubscriptionStatus,
    enabled:  isLoggedIn,          // only fetch when logged in
    staleTime: 5 * 60 * 1000,     // 5 minutes
    gcTime:    10 * 60 * 1000,    // keep in cache 10 minutes
    refetchOnWindowFocus: true,
  });

  return {
    ...query,
    isValid:       query.data?.is_valid      ?? false,
    status:        query.data?.status        ?? 'none',
    daysRemaining: query.data?.days_remaining ?? 0,
    plan:          query.data?.plan          ?? null,
  };
}
