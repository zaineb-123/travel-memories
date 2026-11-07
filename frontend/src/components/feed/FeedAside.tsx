'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PassportCover } from '@/components/passport/PassportCover';
import { Stamp } from '@/components/passport/Stamp';
import { useTravelStats } from '@/hooks/useTravelStats';
import { useWorld } from '@/hooks/useWorld';
import { statsApi, type FriendStamp } from '@/lib/api/stats';
import { countryNameFr } from '@/lib/countries';
import { suggestNext } from '@/lib/travel';
import type { World } from '@/lib/world';

type FeedUser = { id: number; username: string; full_name?: string; countries_visited?: number; memories_count?: number };

/** Colonne de gauche du fil : mon passeport fermé, avec mes chiffres. */
export function PassportAside({ user }: { user: FeedUser }) {
  const { stats, visited } = useTravelStats(user.username);
  const year = new Date().getFullYear();
  const stampsThisYear = visited.filter((v) => v.firstDate.startsWith(String(year))).length;
  return (
    <div className="space-y-3">
      <PassportCover name={user.full_name || user.username} userId={user.id} />
      <div className="rounded-[20px] border border-[#E3E7EC] bg-white p-5">
        <dl className="grid grid-cols-3 gap-2">
          {[
            [stats?.total_countries ?? user.countries_visited ?? 0, 'pays'],
            [stats?.total_memories ?? user.memories_count ?? 0, 'souvenirs'],
            [stampsThisYear, `tampons en ${year}`],
          ].map(([n, label]) => (
            <div key={label as string}>
              <dt className="font-display text-[42px] leading-none text-[#111A22]">{n}</dt>
              <dd className="mt-1.5 text-[13px] leading-tight text-[#46525E]">{label}</dd>
            </div>
          ))}
        </dl>
        <Link
          href={`/profile/${user.username}`}
          className="mt-5 block rounded-xl border border-[#111A22] py-2.5 text-center text-[15px] font-medium text-[#111A22] transition hover:bg-[#111A22] hover:text-white"
        >
          Ouvrir mon passeport
        </Link>
      </div>
    </div>
  );
}

function relative(iso: string) {
  const days = Math.round((Date.now() - new Date(`${iso}T12:00:00`).getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  return `il y a ${days} jours`;
}

/** Colonne de droite : derniers tampons de mes amis, puis les pays voisins à colorier. */
export function StampsAside({ user }: { user: FeedUser }) {
  const world = useWorld();
  const [stamps, setStamps] = useState<FriendStamp[] | null>(null);
  const { visited } = useTravelStats(user.username);

  useEffect(() => {
    statsApi.friends().then((r) => setStamps(r.data.stamps)).catch(() => setStamps([]));
  }, []);

  const next = useMemo(() => (world ? suggestNext(world, visited, 3) : []), [world, visited]);

  return (
    <div className="space-y-4">
      <section className="rounded-[20px] border border-[#E3E7EC] bg-white p-5">
        <h2 className="text-[16px] font-semibold text-[#111A22]">Tampons de tes amis</h2>
        {stamps === null ? (
          <p className="mt-4 text-sm text-[#7A8794]">Chargement…</p>
        ) : stamps.length === 0 ? (
          <p className="mt-3 text-[14px] leading-snug text-[#46525E]">Les nouveaux pays de tes abonnements apparaîtront ici.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {stamps.slice(0, 3).map((s) => (
              <li key={`${s.username}-${s.country}`} className="flex items-center gap-3">
                <Link href={`/profile/${s.username}`} className="shrink-0">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={s.avatar_url} />
                    <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{s.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
                <p className="min-w-0 flex-1 text-[15px] leading-snug text-[#111A22]">
                  <Link href={`/profile/${s.username}`} className="font-semibold hover:underline">
                    {(s.full_name || s.username).split(' ')[0]}
                  </Link>{' '}
                  a tamponné
                  <br />
                  <span className="text-[#46525E]">
                    {s.country}, {relative(s.date)}
                  </span>
                </p>
                <Stamp country={s.country} date={s.date} size={84} className="shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[20px] border border-[#E3E7EC] bg-white p-5">
        <h2 className="text-[16px] font-semibold text-[#111A22]">À colorier ensuite</h2>
        <p className="font-display-italic text-[19px] text-[#46525E]">Trois pays voisins de tes tampons.</p>
        {next.length === 0 ? (
          <p className="mt-3 text-[14px] text-[#7A8794]">Publie un premier souvenir pour voir tes prochains pays.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {next.map((n) => (
              <li key={n.numeric} className="flex items-center gap-4">
                {world && <CountryShape world={world} numeric={n.numeric} />}
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-[#111A22]">{countryNameFr(n.numeric)}</p>
                  <p className="text-[14px] leading-snug text-[#46525E]">
                    Voisine {n.near.length > 1 ? `de ${n.near.slice(0, 2).map((x) => `${articleFor(countryNameFr(x))}`).join(' et ')}` : `de ${articleFor(countryNameFr(n.near[0]))}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** « la France », « le Maroc », « l’Égypte » : article pour la phrase « Voisine de … ». */
function articleFor(name: string) {
  const FEM = new Set(['France', 'Espagne', 'Italie', 'Algérie', 'Tunisie', 'Libye', 'Allemagne', 'Belgique', 'Suisse', 'Autriche', 'Grèce', 'Turquie', 'Pologne', 'Hongrie', 'Roumanie', 'Bulgarie', 'Serbie', 'Slovaquie', 'Slovénie', 'Croatie', 'Ukraine', 'Russie', 'Norvège', 'Suède', 'Finlande', 'Irlande', 'Mauritanie', 'Chine', 'Inde', 'Thaïlande', 'Birmanie', 'Malaisie', 'Géorgie', 'Arménie', 'Jordanie', 'Syrie', 'Arabie saoudite', 'Éthiopie', 'Somalie', 'Tchéquie', 'Lituanie', 'Lettonie', 'Estonie', 'Biélorussie', 'Moldavie', 'Albanie']);
  if (/^[AEIOUÉÈÊHÎÔ]/i.test(name)) return `l’${name}`;
  if (name.startsWith('Pays-Bas') || name.startsWith('États-Unis')) return `les ${name}`;
  return FEM.has(name) ? `la ${name}` : `le ${name}`;
}

function CountryShape({ world, numeric }: { world: World; numeric: string }) {
  const c = world.byId.get(numeric);
  if (!c) return <span className="h-12 w-14 shrink-0" />;
  const [[x0, y0], [x1, y1]] = c.bounds;
  const pad = Math.max(x1 - x0, y1 - y0) * 0.08;
  return (
    <svg viewBox={`${x0 - pad} ${y0 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}`} className="h-12 w-14 shrink-0" aria-hidden>
      <path d={c.d} fill="#C5CED6" />
    </svg>
  );
}
