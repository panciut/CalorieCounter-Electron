import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { AppNotification } from '../types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const dayRef = useRef<string>(new Date().toDateString());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.notifications.getAll();
      setNotifications(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    function onVisibility() {
      if (document.visibilityState === 'visible') refresh();
    }
    document.addEventListener('visibilitychange', onVisibility);

    const interval = window.setInterval(() => {
      const now = new Date().toDateString();
      if (now !== dayRef.current) {
        dayRef.current = now;
        refresh();
      }
    }, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const dismiss = useCallback(async (key: string) => {
    await api.notifications.dismiss(key, null);
    await refresh();
  }, [refresh]);

  const snooze = useCallback(async (key: string, days = 1) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    await api.notifications.dismiss(key, d.toISOString());
    await refresh();
  }, [refresh]);

  const dismissAll = useCallback(async (keys?: string[]) => {
    await api.notifications.dismissAll(keys);
    await refresh();
  }, [refresh]);

  const undoDismiss = useCallback(async (key: string) => {
    await api.notifications.undoDismiss(key);
    await refresh();
  }, [refresh]);

  return { notifications, loading, refresh, dismiss, snooze, dismissAll, undoDismiss };
}
