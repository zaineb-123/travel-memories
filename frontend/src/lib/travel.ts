import { CONTINENTS, CONTINENT_TOTALS, WORLD_TOTAL, resolveCountry, continentOfNumeric, isSovereign, type Continent } from './countries';
import type { TravelCountry } from './api/stats';
import type { World } from './world';

/** Un pays visité, relié à une forme de la carte. `numeric` est vide si le nom n'est pas reconnu. */
export interface VisitedCountry {
  numeric: string;
  alpha2: string;
  name: string;
  memories: number;
  firstDate: string;
  dates: string[];
}

/** Regroupe les pays de l'API par pays reconnu (« Tunisie » et « tunisia » ne font qu'un). Les noms inconnus sont ignorés. */
export function toVisited(rows: TravelCountry[]): VisitedCountry[] {
  const out = new Map<string, VisitedCountry>();
  for (const r of rows) {
    const c = resolveCountry(r.country);
    if (!c) continue;
    const prev = out.get(c.numeric);
    const dates = [...(prev?.dates ?? []), ...r.dates].sort();
    out.set(c.numeric, {
      numeric: c.numeric,
      alpha2: c.alpha2,
      name: prev?.name ?? r.country,
      memories: (prev?.memories ?? 0) + r.memories,
      firstDate: dates[0] ?? r.first_date,
      dates,
    });
  }
  return [...out.values()];
}

/** Pays vus à la fin de l'année `year` : seuls les souvenirs datés jusque-là comptent. */
export function visitedUntil(all: VisitedCountry[], year: number | null): VisitedCountry[] {
  if (year == null) return all;
  return all
    .map((v) => {
      const dates = v.dates.filter((d) => Number(d.slice(0, 4)) <= year);
      return dates.length ? { ...v, dates, memories: dates.length, firstDate: dates[0] } : null;
    })
    .filter((v): v is VisitedCountry => !!v);
}

/** Teinte de la carte : 1, 2, 3-4, 5 souvenirs et plus. */
export function shadeFor(memories: number): 1 | 2 | 3 | 4 {
  return memories >= 5 ? 4 : memories >= 3 ? 3 : memories === 2 ? 2 : 1;
}

export function continentProgress(visited: { numeric: string }[]) {
  const counts: Record<Continent, number> = { europe: 0, asie: 0, afrique: 0, ameriques: 0, oceanie: 0 };
  for (const v of visited) {
    const c = continentOfNumeric(v.numeric);
    if (c) counts[c]++;
  }
  return CONTINENTS.map(({ id, label }) => ({ id, label, count: counts[id], total: CONTINENT_TOTALS[id] }));
}

export const BADGE_STEPS = [5, 10, 25] as const;
export const BADGE_NAMES: Record<number, string> = { 5: 'Explorateur', 10: 'Aventurier', 25: 'Globe-trotter' };

export function nextBadge(countries: number) {
  const target = BADGE_STEPS.find((s) => s > countries) ?? null;
  return target ? { target, name: BADGE_NAMES[target] } : null;
}

export function worldPercent(count: number) {
  return Math.round((count / WORLD_TOTAL) * 100);
}

/**
 * Pays à colorier ensuite : États non visités qui touchent le plus de pays déjà visités.
 * Servent au bloc « À colorier ensuite », à l'onglet « À découvrir » et aux « tampons proches » du prochain badge.
 */
export function suggestNext(world: World, visited: VisitedCountry[], limit = 3) {
  const seen = new Set(visited.map((v) => v.numeric));
  const score = new Map<string, string[]>();
  for (const v of visited) {
    const from = world.byId.get(v.numeric);
    if (!from) continue;
    for (const n of from.neighbors) {
      if (seen.has(n) || !isSovereign(n)) continue;
      score.set(n, [...(score.get(n) ?? []), v.numeric]);
    }
  }
  return [...score.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([numeric, near]) => ({ numeric, near }));
}

export function isNewCountry(visited: VisitedCountry[], countryName: string) {
  const c = resolveCountry(countryName);
  return !!c && !visited.some((v) => v.numeric === c.numeric);
}

const MONTHS = ['JAN', 'FÉV', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];

export function stampDate(iso: string, style: 'text' | 'dots' = 'text') {
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return style === 'dots' ? `${d}.${m}.${y}` : `${d} ${MONTHS[Number(m) - 1] ?? m}`;
}

export function passportNumber(id: number | undefined) {
  const n = String(id ?? 0).padStart(4, '0');
  return `TM ${n.slice(-4).padStart(4, '0')} ${String((id ?? 0) * 7731 + 7731).padStart(4, '0').slice(-4)}`;
}

export function monthYear(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/** Teintes de la carte pour une liste de pays visités. */
export function shadesOf(visited: VisitedCountry[]) {
  const out: Record<string, 1 | 2 | 3 | 4> = {};
  for (const v of visited) out[v.numeric] = shadeFor(v.memories);
  return out;
}
