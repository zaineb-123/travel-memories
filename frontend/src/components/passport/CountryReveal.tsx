'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { WorldMap } from './WorldMap';
import { Stamp } from './Stamp';
import { WORLD_TOTAL, resolveCountry } from '@/lib/countries';
import { nextBadge, shadesOf, worldPercent, type VisitedCountry } from '@/lib/travel';

interface CountryRevealProps {
  /** Pays saisi dans le souvenir (ex. « Espagne »). */
  country: string;
  /** Date du voyage = date du tampon. */
  date: string;
  /** Pays déjà colorés avant ce souvenir. */
  visitedBefore: VisitedCountry[];
  onPassport: () => void;
  onContinue: () => void;
}

/** Écran affiché à la publication d'un souvenir dans un nouveau pays : le pays se colorie, le tampon s'imprime, le compteur monte. */
export function CountryReveal({ country, date, visitedBefore, onPassport, onContinue }: CountryRevealProps) {
  const target = resolveCountry(country);
  const [step, setStep] = useState(0); // 0 carte grise · 1 pays colorié · 2 tampon · 3 compteur
  const cont = useRef<HTMLButtonElement>(null);
  const leave = useRef(onContinue);
  useEffect(() => {
    leave.current = onContinue;
  });

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = [900, 1700, 2300].map((ms, i) => setTimeout(() => setStep(i + 1), reduce ? 0 : ms));
    cont.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && leave.current();
    window.addEventListener('keydown', onKey);
    return () => {
      t.forEach(clearTimeout);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const before = visitedBefore.length;
  const after = before + 1;
  const shades = useMemo(() => {
    const base = shadesOf(visitedBefore);
    return step >= 1 && target ? { ...base, [target.numeric]: 1 as const } : base;
  }, [visitedBefore, step, target]);
  const badge = nextBadge(after);
  const shown = step >= 3 ? after : before;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="reveal-title" className="fixed inset-0 z-[100] overflow-y-auto bg-[#F4F6F8]">
      <div className="mx-auto grid min-h-full max-w-[1300px] items-center gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-[28px] border border-[#E3E7EC] bg-white">
          <WorldMap shades={shades} focus={target ? [target.numeric] : undefined} focusMaxZoom={4} label={`${country} se colorie sur ta carte`} className="h-[340px] sm:h-[520px]" />
        </div>

        <div className="text-center lg:text-left">
          <p className="text-[15px] font-medium text-[#46525E]">Nouveau pays sur ta carte</p>
          <h1 id="reveal-title" className="font-display mt-1 text-[56px] leading-[1.02] text-[#111A22] sm:text-[72px]">
            {country}
          </h1>

          <div className="relative mx-auto my-4 flex h-[190px] w-[190px] items-center justify-center lg:mx-0" aria-hidden={step < 2}>
            {step >= 2 && <Stamp country={country} date={date} size={190} animate />}
          </div>

          <div className="flex items-end justify-center gap-4 lg:justify-start">
            <p className="font-display text-[96px] leading-[0.9] text-[#111A22]" aria-live="polite">
              <span key={shown} className={step >= 3 ? 'count-pop inline-block' : 'inline-block'}>
                {shown}
              </span>
            </p>
            <p className="pb-2 text-left text-[16px] leading-snug text-[#46525E]">
              pays sur {WORLD_TOTAL}
              <br />
              soit {worldPercent(shown)}&nbsp;%
            </p>
          </div>
          {step >= 3 && badge && (
            <p className="mt-2 text-[15px] text-[#46525E]">
              Encore {badge.target - after} pays pour le badge <strong className="text-[#111A22]">{badge.name}</strong>.
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <button ref={cont} type="button" onClick={onContinue} className="rounded-xl bg-[#111A22] px-6 py-3 text-[15px] font-medium text-white hover:bg-[#2A3844]">
              Voir mon souvenir
            </button>
            <button type="button" onClick={onPassport} className="rounded-xl border border-[#111A22] bg-white px-6 py-3 text-[15px] font-medium text-[#111A22] hover:bg-[#F4F6F8]">
              Ouvrir mon passeport
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
