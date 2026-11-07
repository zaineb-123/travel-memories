'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';
import { loadWorld, WORLD_H, WORLD_W, type World } from '@/lib/world';
import { countryNameFr } from '@/lib/countries';
import { SmartImage } from '@/components/ui/SmartImage';

export type Shade = 1 | 2 | 3 | 4;

export interface MapBubble {
  /** Côté de la pastille où s'affiche le nom (par défaut : à gauche de la photo). */
  side?: 'left' | 'right';
  id: string | number;
  label: string;
  lat: number;
  lng: number;
  image?: string;
  href?: string;
}

interface Transform {
  k: number;
  x: number;
  y: number;
}

interface WorldMapProps {
  /** Pays colorés : code numérique ISO → teinte (1 à 4). Tous les autres restent gris. */
  shades: Record<string, Shade>;
  /** Pays proposés (« à découvrir »), teintés de vermillon pâle. */
  highlight?: string[];
  /** Pays sur lesquels cadrer la vue ; sans valeur, on montre le monde entier. */
  focus?: string[];
  /** Zoom maximal quand on cadre un pays. */
  focusMaxZoom?: number;
  /** Délai (ms) avant que chaque pays prenne sa couleur : sert à « Rejouer mes voyages ». */
  delays?: Record<string, number>;
  bubbles?: MapBubble[];
  /** Glisser, molette et boutons +/-. */
  interactive?: boolean;
  className?: string;
  label?: string;
  onWorld?: (world: World) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Carte du monde grise ; seuls les pays visités sont en couleur. */
export function WorldMap({
  shades,
  highlight = [],
  focus,
  focusMaxZoom = 6,
  delays,
  bubbles = [],
  interactive = false,
  className = '',
  label = 'Carte du monde',
  onWorld,
}: WorldMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  // Déplacement manuel, lié au cadrage et à la taille : un nouveau cadrage l'annule d'office.
  const [manual, setManual] = useState<{ key: string; t: Transform } | null>(null);
  const [animate, setAnimate] = useState(false);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    loadWorld().then((w) => {
      if (!alive) return;
      setWorld(w);
      onWorld?.(w);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setSize({ w: Math.max(1, el.clientWidth), h: Math.max(1, el.clientHeight) });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const focusKey = (focus ?? []).join(',');

  // Vue de base : monde entier, ou cadrage sur les pays demandés.
  const base = useMemo<{ t: Transform; min: number; max: number } | null>(() => {
    if (!world || !size) return null;
    const k0 = Math.max(size.w / WORLD_W, size.h / WORLD_H);
    const whole: Transform = { k: k0, x: (size.w - WORLD_W * k0) / 2, y: size.h / 2 - 300 * k0 };
    const shapes = (focus ?? []).map((id) => world.byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c);
    let t = whole;
    if (shapes.length) {
      const x0 = Math.min(...shapes.map((s) => s.bounds[0][0]));
      const y0 = Math.min(...shapes.map((s) => s.bounds[0][1]));
      const x1 = Math.max(...shapes.map((s) => s.bounds[1][0]));
      const y1 = Math.max(...shapes.map((s) => s.bounds[1][1]));
      const k = clamp(0.8 / Math.max((x1 - x0) / size.w, (y1 - y0) / size.h, 1e-6), k0, k0 * focusMaxZoom);
      t = { k, x: size.w / 2 - ((x0 + x1) / 2) * k, y: size.h / 2 - ((y0 + y1) / 2) * k };
    }
    return { t, min: k0, max: k0 * 14 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, size, focusKey, focusMaxZoom]);

  const viewKey = `${focusKey}|${size?.w}|${size?.h}`;
  const user = manual && manual.key === viewKey ? manual.t : null;
  const setUser = useCallback((fn: Transform | ((u: Transform | null) => Transform)) => {
    setManual((m) => {
      const cur = m && m.key === viewKey ? m.t : null;
      return { key: viewKey, t: typeof fn === 'function' ? fn(cur) : fn };
    });
  }, [viewKey]);

  const limit = useCallback(
    (t: Transform): Transform => {
      if (!size || !base) return t;
      const k = clamp(t.k, base.min, base.max);
      return {
        k,
        x: clamp(t.x, Math.min(0, size.w - WORLD_W * k), 0),
        y: clamp(t.y, Math.min(0, size.h - WORLD_H * k), 0),
      };
    },
    [size, base],
  );

  const view = user ?? base?.t ?? { k: 1, x: 0, y: 0 };

  const zoomAt = useCallback(
    (factor: number, px: number, py: number, smooth: boolean) => {
      if (!base) return;
      const cur = user ?? base.t;
      const k = clamp(cur.k * factor, base.min, base.max);
      const r = k / cur.k;
      setAnimate(smooth);
      setUser(limit({ k, x: px - (px - cur.x) * r, y: py - (py - cur.y) * r }));
    },
    [base, user, limit, setUser],
  );

  // La molette doit pouvoir empêcher le défilement de la page : écouteur non passif.
  const wheelRef = useRef(zoomAt);
  useEffect(() => {
    wheelRef.current = zoomAt;
  });
  useEffect(() => {
    const el = box.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      wheelRef.current(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top, false);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [interactive]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || (e.target as HTMLElement).closest('a,button')) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !base) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
    d.moved = true;
    d.x = e.clientX;
    d.y = e.clientY;
    setAnimate(false);
    setUser((u) => limit({ ...(u ?? base.t), x: (u ?? base.t).x + dx, y: (u ?? base.t).y + dy }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const highlightSet = useMemo(() => new Set(highlight), [highlight]);

  // Les formes ne sont recalculées que si les couleurs changent, pas à chaque déplacement.
  const paths = useMemo(
    () =>
      world?.countries.map((c, i) => {
        const shade = shades[c.id];
        const hint = !shade && highlightSet.has(c.id);
        return (
          <path
            key={c.id || `x${i}`}
            d={c.d}
            className="tm-country tm-country-path"
            style={{
              fill: shade ? `var(--map-${shade})` : hint ? 'color-mix(in srgb, var(--stamp-red) 24%, var(--map-land))' : 'var(--map-land)',
              transitionDelay: shade && delays?.[c.id] ? `${delays[c.id]}ms` : undefined,
            }}
          >
            {(shade || hint) && c.id && <title>{countryNameFr(c.id)}</title>}
          </path>
        );
      }),
    [world, shades, highlightSet, delays],
  );

  return (
    <div
      ref={box}
      role="img"
      aria-label={label}
      className={`relative select-none overflow-hidden ${interactive ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
      style={{ touchAction: interactive ? 'pan-y' : undefined }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {size && world && (
        <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} className="block">
          <g
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
              transformOrigin: '0 0',
              transition: animate ? 'transform 0.9s cubic-bezier(.4,0,.2,1)' : 'none',
            }}
          >
            {paths}
          </g>
        </svg>
      )}

      {size &&
        world &&
        bubbles.map((b) => {
          const [px, py] = world.project(b.lng, b.lat);
          const x = view.x + px * view.k;
          const y = view.y + py * view.k;
          if (x < 24 || y < 24 || x > size.w - 24 || y > size.h - 24) return null;
          const inner = (
            <>
              <span className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-[13px] font-medium text-[#111A22] shadow-[0_2px_8px_rgba(17,26,34,0.12)]">
                {b.label}
              </span>
              <span className="block h-[46px] w-[46px] shrink-0 overflow-hidden rounded-full border-[3px] border-white shadow-[0_3px_10px_rgba(17,26,34,0.25)]">
                <SmartImage src={b.image} alt="" className="h-full w-full object-cover" />
              </span>
            </>
          );
          const right = b.side === 'right';
          const cls = `absolute z-10 flex -translate-y-1/2 items-center gap-1.5 ${right ? 'flex-row-reverse' : '-translate-x-full'}`;
          const style = { left: right ? x - 23 : x + 23, top: y };
          return b.href ? (
            <Link key={b.id} href={b.href} className={`${cls} transition hover:scale-[1.03]`} style={style}>
              {inner}
            </Link>
          ) : (
            <div key={b.id} className={cls} style={style}>
              {inner}
            </div>
          );
        })}

      {interactive && size && (
        <div className="absolute right-5 top-5 z-20 flex flex-col overflow-hidden rounded-xl border border-[#E3E7EC] bg-white shadow-sm">
          <button
            type="button"
            aria-label="Zoomer"
            onClick={() => zoomAt(1.6, size.w / 2, size.h / 2, true)}
            className="flex h-10 w-10 items-center justify-center text-[#111A22] hover:bg-[#F4F6F8]"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="h-px bg-[#E3E7EC]" />
          <button
            type="button"
            aria-label="Dézoomer"
            onClick={() => zoomAt(1 / 1.6, size.w / 2, size.h / 2, true)}
            className="flex h-10 w-10 items-center justify-center text-[#111A22] hover:bg-[#F4F6F8]"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
