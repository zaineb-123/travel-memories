import { WORLD_TOTAL } from '@/lib/countries';
import { worldPercent, type continentProgress } from '@/lib/travel';

interface TravelStatsPanelProps {
  count: number;
  /** « pays sur 195, soit 9 % » (vide pour l'onglet « À découvrir »). */
  caption?: string;
  continents: ReturnType<typeof continentProgress>;
  badge: { target: number; name: string } | null;
  /** Pays les plus proches des tampons : cités sous le prochain badge. */
  nearNames: string[];
  /** Remplace le bloc « Prochain badge » (onglets « Mes amis » et « À découvrir »). */
  aside?: React.ReactNode;
}

/** Bandeau sous la carte : score, progression par continent, prochain badge. */
export function TravelStatsPanel({ count, caption, continents, badge, nearNames, aside }: TravelStatsPanelProps) {
  const pct = Math.min(100, (count / WORLD_TOTAL) * 100);
  return (
    <section className="grid gap-8 rounded-[28px] border border-[#E3E7EC] bg-white p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)_minmax(0,1.2fr)] lg:gap-0 lg:p-0">
      <div className="lg:p-10">
        <p className="font-display text-[88px] leading-[0.9] text-[#111A22] sm:text-[120px]" aria-live="polite">
          {count}
        </p>
        <p className="mt-4 text-[18px] text-[#46525E]">{caption ?? `pays sur ${WORLD_TOTAL}, soit ${worldPercent(count)} %`}</p>
        <div className="mt-5 h-[5px] max-w-[320px] overflow-hidden rounded-full bg-[#E3E7EC]">
          <div className="h-full rounded-full bg-[#1F5F7B] transition-[width] duration-700" style={{ width: `${Math.max(pct, count ? 3 : 0)}%` }} />
        </div>
      </div>

      <div className="lg:border-l lg:border-[#E3E7EC] lg:px-10 lg:py-9">
        <h2 className="text-[17px] font-semibold text-[#111A22]">Par continent</h2>
        <ul className="mt-3 space-y-2.5">
          {continents.map((c) => (
            <li key={c.id} className="grid grid-cols-[88px_1fr_52px] items-center gap-4 text-[16px] text-[#111A22]">
              <span>{c.label}</span>
              <span className="h-[3px] overflow-hidden rounded-full bg-[#E3E7EC]" role="img" aria-label={`${c.count} sur ${c.total}`}>
                <span className="block h-full rounded-full bg-[#1F5F7B] transition-[width] duration-700" style={{ width: `${(c.count / c.total) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-[13px] text-[#7A8794]">
                {c.count}/{c.total}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:border-l lg:border-[#E3E7EC] lg:px-10 lg:py-9">
        {aside ?? (
          <>
            <h2 className="text-[17px] font-semibold text-[#111A22]">Prochain badge</h2>
            {badge ? (
              <>
                <p className="font-display mt-1 text-[44px] leading-tight text-[#111A22]">{badge.name}</p>
                <div className="mt-3 h-[4px] overflow-hidden rounded-full bg-[#E3E7EC]">
                  <div className="h-full rounded-full bg-[#111A22] transition-[width] duration-700" style={{ width: `${Math.min(100, (count / badge.target) * 100)}%` }} />
                </div>
                <p className="mt-3 text-[16px] leading-snug text-[#46525E]">
                  {count} pays sur {badge.target}.{nearNames.length > 0 && ` Les plus proches de tes tampons : ${nearNames.join(', ')}.`}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[16px] text-[#46525E]">Tous les badges sont débloqués. Bravo, globe-trotter.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
