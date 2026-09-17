import { useEffect, useState } from 'react';
import type { SubscriptionStatus } from './activation';
import { loadSubscriptionStatus } from './subscription-client';
import { useAuth } from './auth-context';

const EMPTY: SubscriptionStatus = {
  active: false,
  expiresAt: null,
  daysLeft: 0,
  code: null,
  activatedAt: null,
};

export function useSubscription() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setStatus(EMPTY);
      setLoading(false);
      return EMPTY;
    }
    const next = await loadSubscriptionStatus();
    setStatus(next);
    setLoading(false);
    return next;
  };

  useEffect(() => {
    void refresh();
  }, [user?.id]);

  return { ...status, loading, refresh };
}
