'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { WorldMap, type MapBubble, type Shade } from '@/components/passport/WorldMap';
import { MapTimeline } from '@/components/passport/MapTimeline';
import { TravelStatsPanel } from '@/components/passport/TravelStatsPanel';
import { useAuthStore } from '@/store/authStore';
import { useTravelStats } from '@/hooks/useTravelStats';
import { useWorld } from '@/hooks/useWorld';
import { statsApi, type FriendsStats } from '@/lib/api/stats';
import { countryNameFr, resolveCountry } from '@/lib/countries';
import { continentProgress, monthYear, nextBadge, shadeFor, shadesOf, suggestNext, visitedUntil } from '@/lib/travel';

type Tab = 'mine' | 'friends' | 'discover';
const TABS: { id: Tab; label: string }[] = [
  { id: 'mine', label: 'Mes pays' },
  { id: 'friends', label: 'Mes amis' },
  { id: 'discover', label: 'À découvrir' },
];

export default function MyMapPage() {
  const { user, isAuthenticated } = useAuthStore();
  const world = useWorld();
  const { visited: all, stats, loading } = useTravelStats(user?.username);
  const [tab, setTab] = useState<Tab>('mine');
  const [friends, setFriends] = useState<FriendsStats | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (tab !== 'friends' || friends || !isAuthenticated) return;
    statsApi
      .friends()
      .then((r) => setFriends(r.data))
      .catch(() => setFriends({ stamps: [], countries: [] }));
  }, [tab, friends, isAuthenticated]);

  // Années de la frise : du premier tampon à l'année en cours.
  const years = useMemo(() => {
    const first = all.length ? Math.min(...all.map((v) => Number(v.firstDate.slice(0, 4)))) : new Date().getFullYear();
    const last = Math.max(new Date().getFullYear(), ...all.flatMap((v) => v.dates.map((d) => Number(d.slice(0, 4)))));
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  }, [all]);
  const year = picked != null && years.includes(picked) ? picked : years[years.length - 1];

  // « Rejouer mes voyages » : on avance d'une année à la fois, jusqu'à la dernière.
  useEffect(() => {
    if (!playing) return;
    const last = years[years.length - 1];
    const t = setTimeout(() => (year >= last ? setPlaying(false) : setPicked(year + 1)), year >= last ? 1200 : 1500);
    return () => clearTimeout(t);
  }, [playing, year, years]);

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    setPicked(years[0]);
    setPlaying(true);
  };

  const visited = useMemo(() => visitedUntil(all, year), [all, year]);

  const friendRows = useMemo(() => {
    const out = new Map<string, number>();
    for (const c of friends?.countries ?? []) {
      const r = resolveCountry(c.country);
      if (r) out.set(r.numeric, (out.get(r.numeric) ?? 0) + c.friends);
    }
    return out;
  }, [friends]);

  const mine = useMemo(() => new Set(all.map((v) => v.numeric)), [all]);
  const suggestions = useMemo(() => (world ? suggestNext(world, all, 12) : []), [world, all]);

  const shades = useMemo(() => {
    if (tab === 'friends') {
      const o: Record<string, Shade> = {};
      friendRows.forEach((n, id) => (o[id] = shadeFor(n)));
      return o;
    }
    return shadesOf(visited);
  }, [tab, friendRows, visited]);

  // Pendant le rejeu, les pays de l'année en cours se colorient l'un après l'autre.
  const delays = useMemo(() => {
    if (!playing) return undefined;
    const o: Record<string, number> = {};
    visited
      .filter((v) => v.firstDate.startsWith(String(year)))
      .forEach((v, i) => (o[v.numeric] = 250 + i * 260));
    return o;
  }, [playing, visited, year]);

  const bubbles = useMemo<MapBubble[]>(() => {
    if (tab !== 'mine' || !stats || playing) return []; // pas de bulles pendant le rejeu : la carte se colorie seule
    const upto = stats.places.filter((p) => Number(p.travel_date.slice(0, 4)) <= year);
    const seen = new Set<string>();
    const out: MapBubble[] = [];
    for (const p of [...upto].sort((a, b) => b.travel_date.localeCompare(a.travel_date))) {
      const key = p.country.toLowerCase(); // une bulle par pays, pour qu'elles ne se chevauchent pas
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: p.id,
        label: out.length === 0 ? `${p.city || p.country}, ${monthYear(p.travel_date)}` : p.city || p.country,
        lat: p.latitude,
        lng: p.longitude,
        image: p.cover_image,
        href: `/memory/${p.id}`,
        side: p.longitude > 0 && p.longitude < 60 ? 'right' : 'left',
      });
      if (out.length >= 4) break;
    }
    return out;
  }, [tab, stats, year, playing]);

  const friendCountries = [...friendRows.keys()];
  const count = tab === 'friends' ? friendCountries.length : tab === 'discover' ? suggestions.length : visited.length;
  const near = world ? suggestNext(world, all, 3).map((n) => countryNameFr(n.numeric)) : [];
  const counted: { numeric: string }[] = tab === 'friends' ? friendCountries.map((numeric) => ({ numeric })) : visited;

  let aside: React.ReactNode;
  if (tab === 'friends') {
    const fresh = friendCountries.filter((id) => !mine.has(id)).sort((a, b) => (friendRows.get(b) ?? 0) - (friendRows.get(a) ?? 0)).slice(0, 3);
    aside = <AsideList title="Pas encore sur ta carte" lead="Des pays que tes amis ont déjà tamponnés." names={fresh.map(countryNameFr)} empty="Tu as déjà tout ce que tes amis ont vu." />;
  } else if (tab === 'discover') {
    aside = <AsideList title="À colorier ensuite" lead="Les pays voisins de tes tampons." names={suggestions.slice(0, 4).map((s) => countryNameFr(s.numeric))} empty="Publie un premier souvenir pour voir tes prochains pays." />;
  }

  const legendLabel = tab === 'friends' ? 'Amis par pays' : 'Souvenirs par pays';

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-[52px] leading-tight text-[#111A22]">Ma carte du monde</h1>
        <p className="font-display-italic mt-2 text-[22px] text-[#46525E]">Chaque souvenir colorie un pays.</p>
        <Link href="/login" className="mt-8 inline-block rounded-xl bg-[#111A22] px-6 py-3 font-medium text-white hover:bg-[#2A3844]">
          Connecte-toi pour voir ta carte
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-16 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pt-2">
        <div>
          <h1 className="font-display text-[44px] leading-[1.05] text-[#111A22] sm:text-[64px]">Ma carte du monde</h1>
          <p className="font-display-italic text-[22px] text-[#46525E]">Chaque souvenir colorie un pays.</p>
        </div>
        <div role="tablist" className="flex gap-7 pb-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 pb-1 text-[17px] transition ${tab === t.id ? 'border-[#111A22] font-medium text-[#111A22]' : 'border-transparent text-[#46525E] hover:text-[#111A22]'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="relative mt-5 overflow-hidden rounded-[28px] border border-[#E3E7EC] bg-white">
        <WorldMap
          shades={shades}
          highlight={tab === 'discover' ? suggestions.map((s) => s.numeric) : []}
          delays={delays}
          bubbles={bubbles}
          interactive
          label={`Carte du monde : ${count} pays coloriés`}
          className="h-[480px] sm:h-[600px] lg:h-[700px]"
        />

        {loading && (
          <div className="absolute left-1/2 top-5 z-20 -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-sm shadow">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-[#1F5F7B]" />
            Chargement de ta carte…
          </div>
        )}
        {!loading && tab === 'mine' && all.length === 0 && (
          <p className="absolute left-1/2 top-1/2 z-20 w-[min(88%,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/95 p-6 text-center text-[17px] text-[#46525E] shadow-lg">
            Ta carte est encore grise.{' '}
            <Link href="/create" className="font-semibold text-[#111A22] underline">
              Publie un souvenir
            </Link>{' '}
            pour colorier ton premier pays.
          </p>
        )}

        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex flex-col items-stretch gap-3 sm:inset-x-6 sm:bottom-6 lg:flex-row lg:items-center">
          <div className="pointer-events-auto flex shrink-0 items-center gap-4 self-start rounded-xl border border-[#E3E7EC] bg-white/95 px-5 py-3.5 text-[15px] text-[#46525E]">
            <span>{legendLabel}</span>
            <span className="flex h-3 w-[145px] overflow-hidden rounded-sm" aria-hidden>
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className="flex-1" style={{ background: `var(--map-${n})` }} />
              ))}
            </span>
            <span className="font-mono text-[13px]">1 à 5 et plus</span>
          </div>
          {tab === 'mine' && (
            <div className="pointer-events-auto lg:mx-auto lg:-translate-x-[6%]">
              <MapTimeline years={years} year={year} playing={playing} onSelect={(y) => { setPlaying(false); setPicked(y); }} onTogglePlay={togglePlay} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <TravelStatsPanel
          count={count}
          caption={tab === 'friends' ? 'pays visités par tes amis' : tab === 'discover' ? 'pays voisins à colorier' : undefined}
          continents={continentProgress(counted)}
          badge={nextBadge(visited.length)}
          nearNames={near}
          aside={aside}
        />
      </div>
    </div>
  );
}

function AsideList({ title, lead, names, empty }: { title: string; lead: string; names: string[]; empty: string }) {
  return (
    <>
      <h2 className="text-[17px] font-semibold text-[#111A22]">{title}</h2>
      <p className="font-display-italic text-[20px] text-[#46525E]">{lead}</p>
      {names.length === 0 ? (
        <p className="mt-3 text-[16px] text-[#46525E]">{empty}</p>
      ) : (
        <ul className="font-display mt-2 space-y-0.5 text-[30px] leading-tight text-[#111A22]">
          {names.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </>
  );
}
