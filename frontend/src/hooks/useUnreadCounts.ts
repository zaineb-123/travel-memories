'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api/client';

/** Messages et notifications non lus, rafraîchis toutes les 30 s (pas de temps réel côté serveur). */
export function useUnreadCounts() {
  const { isAuthenticated } = useAuthStore();
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });

  useEffect(() => {
    if (!isAuthenticated) {
      setCounts({ messages: 0, notifications: 0 });
      return;
    }
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const [m, n] = await Promise.all([
          apiClient.get<{ data: { count: number } }>('/conversations/unread/count'),
          apiClient.get<{ data: { count: number } }>('/notifications/unread/count'),
        ]);
        if (!stopped) setCounts({ messages: m.data.count, notifications: n.data.count });
      } catch {
        /* silencieux */
      }
    };
    void tick();
    const id = setInterval(tick, 30000);
    const onFocus = () => void tick();
    window.addEventListener('focus', onFocus);
    return () => {
      stopped = true;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated]);

  return counts;
}
