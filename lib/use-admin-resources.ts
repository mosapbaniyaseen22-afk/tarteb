'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadAdminResources, type AdminResource } from '@/lib/admin';
import { type TawjihiStage } from '@/lib/utils';

export function useAdminResources(_stage?: TawjihiStage | string | null) {
  const [resources, setResources] = useState<AdminResource[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const items = await loadAdminResources();
    setResources(items);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await refresh();
      if (active) setLoading(false);
    };
    void load();
    const timer = window.setInterval(() => {
      void refresh();
    }, 15000);
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  return { resources, loading, refresh };
}
