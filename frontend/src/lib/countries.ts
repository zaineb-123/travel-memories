import isoCountries from 'i18n-iso-countries';
import fr from 'i18n-iso-countries/langs/fr.json';
import en from 'i18n-iso-countries/langs/en.json';

isoCountries.registerLocale(fr);
isoCountries.registerLocale(en);

/** Les 195 États reconnus (193 membres de l'ONU + Vatican + Palestine), par continent. */
const CONTINENT_CODES = {
  europe: 'AL AD AT BY BE BA BG HR CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA',
  asie: 'AF AM AZ BH BD BT BN KH CN CY GE IN ID IR IQ IL JP JO KZ KW KG LA LB MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TJ TH TL TR TM AE UZ VN YE',
  afrique: 'DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW',
  ameriques: 'AG AR BS BB BZ BO BR CA CL CO CR CU DM DO EC SV GD GT GY HT HN JM MX NI PA PY PE KN LC VC SR TT US UY VE',
  oceanie: 'AU FJ KI MH FM NR NZ PW PG WS SB TO TV VU',
} as const;

export type Continent = keyof typeof CONTINENT_CODES;

export const CONTINENTS: { id: Continent; label: string }[] = [
  { id: 'europe', label: 'Europe' },
  { id: 'asie', label: 'Asie' },
  { id: 'afrique', label: 'Afrique' },
  { id: 'ameriques', label: 'Amériques' },
  { id: 'oceanie', label: 'Océanie' },
];

const CONTINENT_OF: Record<string, Continent> = {};
export const CONTINENT_TOTALS: Record<Continent, number> = { europe: 0, asie: 0, afrique: 0, ameriques: 0, oceanie: 0 };
for (const [continent, codes] of Object.entries(CONTINENT_CODES) as [Continent, string][]) {
  for (const code of codes.split(' ')) {
    CONTINENT_OF[code] = continent;
    CONTINENT_TOTALS[continent]++;
  }
}

export const WORLD_TOTAL = 195;

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/['’`.]/g, ' ')
    .replace(/[-–_,/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Variantes courantes que les voyageurs tapent à la main. */
const ALIASES: Record<string, string> = {
  usa: 'US', 'etats unis': 'US', 'etats unis d amerique': 'US', 'united states': 'US', 'u s a': 'US', us: 'US',
  uk: 'GB', 'royaume uni': 'GB', angleterre: 'GB', ecosse: 'GB', 'pays de galles': 'GB', 'grande bretagne': 'GB', 'great britain': 'GB', england: 'GB',
  tchequie: 'CZ', 'republique tcheque': 'CZ', 'czech republic': 'CZ',
  'coree du sud': 'KR', coree: 'KR', 'south korea': 'KR', 'coree du nord': 'KP',
  birmanie: 'MM', myanmar: 'MM', 'cote d ivoire': 'CI', 'ivory coast': 'CI',
  russie: 'RU', russia: 'RU', iran: 'IR', syrie: 'SY', vietnam: 'VN', 'viet nam': 'VN', laos: 'LA',
  palestine: 'PS', tanzanie: 'TZ', bolivie: 'BO', venezuela: 'VE', moldavie: 'MD', moldova: 'MD',
  macedoine: 'MK', 'macedoine du nord': 'MK', 'north macedonia': 'MK', rdc: 'CD', 'republique democratique du congo': 'CD', 'congo kinshasa': 'CD', 'congo brazzaville': 'CG',
  'emirats arabes unis': 'AE', emirats: 'AE', turquie: 'TR', turkiye: 'TR', turkey: 'TR',
  swaziland: 'SZ', eswatini: 'SZ', 'cap vert': 'CV', 'timor oriental': 'TL', hollande: 'NL', 'pays bas': 'NL', holland: 'NL',
  vatican: 'VA', 'cite du vatican': 'VA', 'saint siege': 'VA', 'saint vincent et les grenadines': 'VC',
  tunisia: 'TN', morocco: 'MA', algeria: 'DZ', egypt: 'EG', japan: 'JP', iceland: 'IS', italy: 'IT', spain: 'ES', germany: 'DE', greece: 'GR',
};

const LOOKUP = new Map<string, string>();
for (const code of Object.keys(isoCountries.getAlpha2Codes())) {
  for (const lang of ['fr', 'en'] as const) {
    const names = isoCountries.getName(code, lang, { select: 'all' }) as string[] | string | undefined;
    for (const n of Array.isArray(names) ? names : names ? [names] : []) LOOKUP.set(norm(n), code);
  }
}

/** « Tunisie », « tunisia », « TUNISIE » → { alpha2: 'TN', numeric: '788', … } ; null si le pays est inconnu. */
export function resolveCountry(name: string | null | undefined): { alpha2: string; numeric: string; continent: Continent | null } | null {
  if (!name) return null;
  const key = norm(name);
  const alpha2 = ALIASES[key] ?? LOOKUP.get(key);
  if (!alpha2) return null;
  const numeric = isoCountries.alpha2ToNumeric(alpha2);
  if (!numeric) return null;
  return { alpha2, numeric: numeric.padStart(3, '0'), continent: CONTINENT_OF[alpha2] ?? null };
}

/** Nom français d'un pays à partir de son code numérique ISO (ex. « 724 » → « Espagne »). */
export function countryNameFr(numeric: string): string {
  const alpha2 = isoCountries.numericToAlpha2(numeric.padStart(3, '0'));
  if (!alpha2) return numeric;
  const n = isoCountries.getName(alpha2, 'fr', { select: 'official' });
  const NICE: Record<string, string> = { GB: 'Royaume-Uni', US: 'États-Unis', CZ: 'Tchéquie', KR: 'Corée du Sud', KP: 'Corée du Nord', RU: 'Russie', IR: 'Iran', SY: 'Syrie', TZ: 'Tanzanie', VN: 'Vietnam', LA: 'Laos', BO: 'Bolivie', VE: 'Venezuela', MD: 'Moldavie', MK: 'Macédoine du Nord', CD: 'RD Congo', PS: 'Palestine', BN: 'Brunei' };
  return NICE[alpha2] ?? n ?? alpha2;
}

export function continentOfNumeric(numeric: string): Continent | null {
  const a2 = isoCountries.numericToAlpha2(numeric.padStart(3, '0'));
  return a2 ? (CONTINENT_OF[a2] ?? null) : null;
}

export function isSovereign(numeric: string): boolean {
  return continentOfNumeric(numeric) !== null;
}
