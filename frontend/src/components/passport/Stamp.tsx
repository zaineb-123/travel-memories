'use client';

import { useId } from 'react';
import { stampDate } from '@/lib/travel';

type Kind = 'circle' | 'rect' | 'oval';
const INKS = ['#2F4B8F', '#C23B2E', '#2E7D5B'];
const KINDS: Kind[] = ['circle', 'rect', 'oval', 'circle', 'rect'];

function hash(s: string) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

interface StampProps {
  country: string;
  /** Date ISO (AAAA-MM-JJ) du premier souvenir dans le pays. */
  date?: string;
  /** Tampon pâle en pointillés : le prochain pays à colorier. */
  ghost?: boolean;
  /** Joue l'animation d'impression. */
  animate?: boolean;
  size?: number;
  className?: string;
}

/** Tampon de passeport en SVG. Forme, encre et inclinaison dépendent du pays : le même pays donne toujours le même tampon. */
export function Stamp({ country, date, ghost = false, animate = false, size = 150, className = '' }: StampProps) {
  const uid = useId().replace(/:/g, '');
  const h = hash(country.toLowerCase());
  const kind = KINDS[h % KINDS.length];
  const ink = ghost ? '#A9B3BD' : INKS[(h >> 3) % INKS.length];
  const rot = (((h >> 5) % 13) - 6) * 1.1;
  const dateLabel = stampDate(date ?? '', 'text');
  const year = date?.slice(0, 4) ?? '';
  const upper = country.toUpperCase();

  // Bruit d'encre : bords irréguliers et petits manques, comme un vrai tampon.
  const filter = (
    <filter id={`ink${uid}`} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={h % 50} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" result="d" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.55" result="mask" />
      <feComposite in="d" in2="mask" operator="in" />
    </filter>
  );

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={`Tampon ${country}${date ? `, ${date}` : ''}`}
      className={`${animate ? 'stamp-in' : ''} ${className}`}
      style={{ ['--stamp-rot' as string]: `${rot}deg`, transform: `rotate(${rot}deg)`, opacity: ghost ? 0.9 : 0.92, mixBlendMode: 'multiply' }}
    >
      <defs>
        {filter}
        <path id={`top${uid}`} d="M 38 100 A 62 62 0 0 1 162 100" />
        <path id={`bot${uid}`} d="M 30 100 A 70 70 0 0 0 170 100" />
      </defs>
      <g filter={ghost ? undefined : `url(#ink${uid})`} fill="none" stroke={ink} strokeWidth="3" strokeDasharray={ghost ? '3 4' : undefined} style={{ color: ink }}>
        {kind === 'circle' && (
          <>
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="60" strokeWidth="2.2" />
            <text fontSize="19" fontWeight="700" letterSpacing="3" fill={ink} stroke="none" textAnchor="middle" fontFamily="var(--font-sans)">
              <textPath href={`#top${uid}`} startOffset="50%">
                {upper.length > 11 ? upper.slice(0, 11) : upper}
              </textPath>
            </text>
            <text fontSize="9.5" fontWeight="700" letterSpacing="2.5" fill={ink} stroke="none" textAnchor="middle" fontFamily="var(--font-mono)">
              <textPath href={`#bot${uid}`} startOffset="50%">
                ARRIVÉE
              </textPath>
            </text>
            {date && (
              <>
                <text x="100" y="97" textAnchor="middle" fontSize="19" fontWeight="600" fill={ink} stroke="none" fontFamily="var(--font-mono)">
                  {dateLabel}
                </text>
                <text x="100" y="120" textAnchor="middle" fontSize="17" fontWeight="500" fill={ink} stroke="none" fontFamily="var(--font-mono)">
                  {year}
                </text>
              </>
            )}
          </>
        )}

        {kind === 'rect' && (
          <>
            <rect x="14" y="40" width="172" height="120" rx="4" />
            <rect x="21" y="47" width="158" height="106" rx="2" strokeWidth="1.6" />
            <text x="100" y="92" textAnchor="middle" fontSize={upper.length > 9 ? 25 : 31} fontWeight="800" fill={ink} stroke="none" fontFamily="var(--font-sans)">
              {upper.charAt(0) + upper.slice(1).toLowerCase()}
            </text>
            <line x1="38" y1="106" x2="162" y2="106" strokeWidth="1.6" strokeDasharray="2 3" />
            {date && (
              <text x="100" y="134" textAnchor="middle" fontSize="19" fontWeight="600" letterSpacing="1" fill={ink} stroke="none" fontFamily="var(--font-mono)">
                {stampDate(date, 'dots')}
              </text>
            )}
          </>
        )}

        {kind === 'oval' && (
          <>
            <ellipse cx="100" cy="100" rx="94" ry="62" />
            <ellipse cx="100" cy="100" rx="84" ry="52" strokeWidth="1.8" />
            <text x="100" y="97" textAnchor="middle" fontSize={upper.length > 9 ? 25 : 31} fontWeight="800" fill={ink} stroke="none" fontFamily="var(--font-sans)">
              {upper.charAt(0) + upper.slice(1).toLowerCase()}
            </text>
            {date && (
              <text x="100" y="128" textAnchor="middle" fontSize="18" fontWeight="600" letterSpacing="1" fill={ink} stroke="none" fontFamily="var(--font-mono)">
                {stampDate(date, 'dots')}
              </text>
            )}
          </>
        )}
      </g>
    </svg>
  );
}
