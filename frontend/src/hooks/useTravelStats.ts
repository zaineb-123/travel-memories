'use client';

import { useEffect, useMemo, useState } from 'react';
import { statsApi, type TravelStats } from '@/lib/api/stats';
import { toVisited } from '@/lib/travel';

interface Loaded {
  key: string;
  stats: TravelStats | null;
}

/** Statistiques de voyage d'un voyageur : pays visités (avec dates de tampon), pastilles photo, badges. */
export function useTravelStats(username?: string | null, refreshKey: unknown = 0) {
  const key = username ? `${username}|${String(refreshKey)}` : '';
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!username) return;
    let alive = true;
    statsApi
      .travel(username)
      .then((r) => alive && setLoaded({ key, stats: r.data }))
      .catch(() => alive && setLoaded({ key, stats: null }));
    return () => {
      alive = false;
    };
  }, [username, key]);

  // Les données d'un autre voyageur (ou d'un état précédent) ne sont jamais affichées pendant le chargement.
  const current = key && loaded?.key === key ? loaded : null;
  const stats = current?.stats ?? null;
  const visited = useMemo(() => toVisited(stats?.countries ?? []), [stats]);
  return { stats, visited, loading: !!key && !current, error: !!current && !current.stats };
}
