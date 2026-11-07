'use client';

import { useMemo, useState } from 'react';
import isoCountries from 'i18n-iso-countries';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WorldMap } from './WorldMap';
import { Stamp } from './Stamp';
import { useWorld } from '@/hooks/useWorld';
import { BADGE_STEPS, monthYear, nextBadge, shadesOf, suggestNext, worldPercent, type VisitedCountry } from '@/lib/travel';
import { WORLD_TOTAL, countryNameFr, resolveCountry } from '@/lib/countries';
import type { TravelStats } from '@/lib/api/stats';
import type { User } from '@/types';

const PER_PAGE = 7;

// Guillochis très pâles, comme le fond d'un vrai passeport
const GUILLOCHE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='32' viewBox='0 0 64 32'><g fill='none' stroke='#1F5F7B' stroke-opacity='.075' stroke-width='1'><path d='M0 16 Q16 0 32 16 T64 16'/><path d='M0 16 Q16 32 32 16 T64 16'/></g></svg>`,
)}")`;

function mrz(user: User) {
  const clean = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z ]/g, '')
      .trim();
  const parts = clean(user.full_name || user.username).split(/\s+/).filter(Boolean);
  const last = parts.length > 1 ? parts.slice(-1)[0] : (parts[0] ?? 'X');
  const first = parts.length > 1 ? parts.slice(0, -1).join('<') : '';
  const a2 = resolveCountry(user.country)?.alpha2;
  const a3 = (a2 && isoCountries.alpha2ToAlpha3(a2)) || 'XXX';
  const pad = (s: string, n: number) => (s + '<'.repeat(n)).slice(0, n);
  const num = String(user.id).padStart(5, '0') + String((user.id * 7731) % 10000).padStart(4, '0');
  return [pad(`P<${a3}${last}<<${first}`, 44), pad(`TM${num}<4${a3}${String(90 + (user.id % 9))}03217F2603149`, 44)];
}

interface PassportSpreadProps {
  user: User;
  stats: TravelStats;
  visited: VisitedCountry[];
  isOwn: boolean;
}

/** Profil en passeport ouvert : page de gauche (carte, score, badges), page de droite (tampons, avec pagination). */
export function PassportSpread({ user, stats, visited, isOwn }: PassportSpreadProps) {
  const world = useWorld();
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => [...visited].sort((a, b) => b.firstDate.localeCompare(a.firstDate)), [visited]);
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const slice = sorted.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  const shades = useMemo(() => shadesOf(visited), [visited]);
  const count = stats.total_countries;
  const first = useMemo(() => [...visited].sort((a, b) => a.firstDate.localeCompare(b.firstDate))[0], [visited]);
  const last = useMemo(() => [...visited].sort((a, b) => (b.dates.at(-1) ?? '').localeCompare(a.dates.at(-1) ?? ''))[0], [visited]);
  const next = world ? suggestNext(world, visited, 1)[0] : undefined;
  const nextName = next ? countryNameFr(next.numeric) : null;
  const badge = nextBadge(count);
  const lines = mrz(user);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#E3E7EC] bg-[#FAFAF6] shadow-[0_30px_50px_-30px_rgba(17,26,34,0.35)]">
      <div className="grid md:grid-cols-2" style={{ backgroundImage: GUILLOCHE }}>
        {/* Page de gauche */}
        <section className="relative flex flex-col p-6 sm:p-8" aria-label="Pays explorés">
          <h2 className="font-display text-[28px] text-[#111A22]">Pays explorés</h2>
          <WorldMap
            shades={shades}
            focus={visited.map((v) => v.numeric)}
            focusMaxZoom={2.4}
            label={`Carte des ${count} pays explorés`}
            className="mt-3 h-[230px] rounded-xl border border-[#E3E7EC] bg-white sm:h-[290px]"
          />

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-[88px] leading-[0.9] text-[#111A22] sm:text-[104px]">{count}</p>
              <p className="mt-2 text-[15px] text-[#46525E]">
                sur {WORLD_TOTAL} pays, soit {worldPercent(count)}&nbsp;%
              </p>
            </div>
            <div className="space-y-3 pt-1 text-right text-[13px]">
              {first && (
                <div>
                  <p className="text-[#7A8794]">Premier voyage documenté</p>
                  <p className="text-[17px] font-semibold text-[#111A22]">
                    {first.name}, {monthYear(first.firstDate)}
                  </p>
                </div>
              )}
              {last && (
                <div>
                  <p className="text-[#7A8794]">Dernier voyage</p>
                  <p className="text-[17px] font-semibold text-[#111A22]">
                    {last.name}, {monthYear(last.dates.at(-1))}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            {BADGE_STEPS.map((step) => {
              const got = count >= step;
              return (
                <span
                  key={step}
                  title={got ? `Badge ${step} pays obtenu` : `Badge ${step} pays à venir`}
                  className={`flex h-[58px] w-[58px] items-center justify-center rounded-full font-display text-[30px] ${
                    got ? 'bg-[#111A22] text-white ring-2 ring-[#B8944D] ring-offset-2 ring-offset-[#FAFAF6]' : 'border border-dashed border-[#B9C3CC] text-[#B9C3CC]'
                  }`}
                >
                  {step}
                </span>
              );
            })}
            <p className="font-display-italic ml-1 text-[18px] leading-tight text-[#46525E]">
              Badges&nbsp;: {count} pays
              <br />
              sur {badge?.target ?? BADGE_STEPS[BADGE_STEPS.length - 1]}
            </p>
          </div>

          {nextName && (
            <div className="mt-5 flex items-center gap-4 rounded-2xl border border-dashed border-[#B9C3CC] bg-white/70 p-4">
              <Stamp country={nextName} date="2026-11-02" ghost size={78} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-[#111A22]">Prochain tampon&nbsp;: {nextName}</p>
                <p className="text-[14px] leading-snug text-[#46525E]">
                  {isOwn ? 'Publie un souvenir là-bas pour colorier le pays.' : 'Un pays voisin de ses tampons.'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-auto pt-8 font-mono text-[11px] leading-5 tracking-[0.12em] text-[#7A8794]" aria-hidden>
            <p className="truncate">{lines[0]}</p>
            <p className="truncate">{lines[1]}</p>
          </div>
        </section>

        {/* Reliure + page de droite */}
        <section className="relative flex flex-col border-t border-[#E3E7EC] p-6 sm:p-8 md:border-l md:border-t-0" aria-label="Tampons">
          <span className="pointer-events-none absolute inset-y-0 left-0 hidden w-4 bg-gradient-to-r from-[#11202b]/10 to-transparent md:block" />
          <h2 className="font-display text-[28px] text-[#111A22]">Tampons</h2>

          {sorted.length === 0 ? (
            <p className="mt-10 text-center text-[#7A8794]">
              {isOwn ? 'Aucun tampon pour l’instant : publie un souvenir pour colorier ton premier pays.' : 'Aucun tampon pour l’instant.'}
            </p>
          ) : (
            <ul className="mt-2 grid flex-1 grid-cols-2 content-start gap-x-2 gap-y-1 sm:gap-y-2">
              {slice.map((v, i) => (
                <li
                  key={v.numeric}
                  className={`flex items-center justify-center ${i === slice.length - 1 && slice.length % 2 === 1 ? 'col-span-2' : ''}`}
                  style={{ marginTop: i % 2 ? 22 : 0 }}
                >
                  <Stamp country={v.name} date={v.firstDate} size={170} animate={page === 0} />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              aria-label="Page précédente"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#111A22] bg-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-display-italic px-1 text-[17px] text-[#46525E]">
              Page {page + 1} sur {pages}
            </span>
            <button
              type="button"
              aria-label="Page suivante"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#111A22] bg-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
