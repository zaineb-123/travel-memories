'use client';

import { useEffect, useState } from 'react';
import { loadWorld, type World } from '@/lib/world';

/** Fond de carte (chargé à la demande, une seule fois pour toute l'application). */
export function useWorld() {
  const [world, setWorld] = useState<World | null>(null);
  useEffect(() => {
    let alive = true;
    loadWorld().then((w) => alive && setWorld(w));
    return () => {
      alive = false;
    };
  }, []);
  return world;
}
