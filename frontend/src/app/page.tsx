'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  animate,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowRight, Award, Navigation, Play, Stamp as StampIcon } from 'lucide-react';
import { WorldMap, type MapBubble, type Shade } from '@/components/passport/WorldMap';
import { MapTimeline } from '@/components/passport/MapTimeline';
import { Stamp } from '@/components/passport/Stamp';
import { SmartImage } from '@/components/ui/SmartImage';
import { resolveCountry } from '@/lib/countries';
import { shadeFor, visitedUntil, type VisitedCountry } from '@/lib/travel';

/* ------------------------------------------------------------------ */
/*  Données de démonstration (aucun appel API : la page est publique)  */
/* ------------------------------------------------------------------ */

const DEMO_RAW: { name: string; first: string; memories: number }[] = [
  { name: 'France', first: '2019-03-21', memories: 4 },
  { name: 'Italie', first: '2019-08-10', memories: 3 },
  { name: 'Allemagne', first: '2020-02-14', memories: 2 },
  { name: 'Royaume-Uni', first: '2021-07-03', memories: 2 },
  { name: 'Tunisie', first: '2021-08-14', memories: 4 },
  { name: 'Portugal', first: '2022-04-09', memories: 2 },
  { name: 'Maroc', first: '2022-11-05', memories: 3 },
  { name: 'Égypte', first: '2023-02-12', memories: 2 },
  { name: 'Turquie', first: '2023-09-18', memories: 2 },
  { name: 'Grèce', first: '2023-10-02', memories: 2 },
  { name: 'Thaïlande', first: '2024-01-28', memories: 2 },
  { name: 'Japon', first: '2024-10-02', memories: 3 },
  { name: 'Islande', first: '2025-02-11', memories: 1 },
  { name: 'États-Unis', first: '2025-07-20', memories: 3 },
  { name: 'Brésil', first: '2025-11-08', memories: 2 },
  { name: 'Mexique', first: '2026-01-15', memories: 2 },
  { name: 'Inde', first: '2026-03-04', memories: 1 },
  { name: 'Australie', first: '2026-08-22', memories: 1 },
  { name: 'Suisse', first: '2026-09-09', memories: 1 },
];

const DEMO: VisitedCountry[] = DEMO_RAW.flatMap((d) => {
  const c = resolveCountry(d.name);
  if (!c) return [];
  const dates = Array.from({ length: d.memories }, (_, i) => {
    const day = Number(d.first.slice(8)) + i;
    return `${d.first.slice(0, 8)}${String(Math.min(day, 28)).padStart(2, '0')}`;
  });
  return [{ numeric: c.numeric, alpha2: c.alpha2, name: d.name, memories: d.memories, firstDate: d.first, dates }];
});

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const WORLD_TOTAL = 195;

function shadesOf(list: VisitedCountry[]): Record<string, Shade> {
  return Object.fromEntries(list.map((v) => [v.numeric, shadeFor(v.memories)]));
}

const ALL_SHADES = shadesOf(DEMO);

const PHOTO = {
  tokyo: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=300&h=300&fit=crop',
  bali: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=300&h=300&fit=crop',
  paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300&h=300&fit=crop',
  swiss: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=300&h=300&fit=crop',
};

const HERO_BUBBLES: MapBubble[] = [
  { id: 'jp', label: 'Tokyo', lat: 35.7, lng: 139.7, image: PHOTO.tokyo },
  { id: 'th', label: 'Bali', lat: -8.4, lng: 115.2, image: PHOTO.bali, side: 'right' },
  { id: 'fr', label: 'Paris', lat: 48.8, lng: 2.3, image: PHOTO.paris },
];

const EASE = [0.2, 0.8, 0.3, 1] as const;

/* ------------------------------------------------------------------ */
/*  Petits utilitaires                                                 */
/* ------------------------------------------------------------------ */

function Counter({ to, run, instant }: { to: number; run: boolean; instant?: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (instant || !run) return;
    const c = animate(0, to, { duration: 2.6, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [to, run, instant]);
  return <>{instant ? to : n}</>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-[#7A8794]">{children}</p>;
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

function scrollToY(y: number) {
  window.scrollTo({ top: y, behavior: 'smooth' });
}

/* ------------------------------------------------------------------ */
/*  1. HERO : le monde gris se colorie tout seul                       */
/* ------------------------------------------------------------------ */

function Hero({ reduce }: { reduce: boolean }) {
  const [colored, setColored] = useState(reduce);
  const [stamps, setStamps] = useState(reduce ? 2 : 0);

  useEffect(() => {
    if (reduce) return;
    const t1 = setTimeout(() => setColored(true), 900);
    const t2 = setTimeout(() => setStamps(1), 3400);
    const t3 = setTimeout(() => setStamps(2), 4100);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [reduce]);

  const delays = useMemo(
    () => (reduce ? undefined : Object.fromEntries(DEMO.map((v, i) => [v.numeric, i * 170]))),
    [reduce],
  );

  // Parallaxe : la carte suit doucement la souris.
  const mx = useSpring(0, { stiffness: 60, damping: 20 });
  const my = useSpring(0, { stiffness: 60, damping: 20 });
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * -26);
    my.set(((e.clientY - r.top) / r.height - 0.5) * -16);
  };

  const words1 = ['Chaque', 'souvenir'];
  const words2 = ['un', 'pays.'];
  const wordCls = 'inline-block will-change-transform';
  const wordMotion = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 60, rotate: 3 },
    animate: { opacity: 1, y: 0, rotate: 0 },
    transition: { duration: 0.9, ease: EASE, delay: 0.15 + i * 0.12 },
  });

  return (
    <section onMouseMove={onMove} className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#F4F5F7]">
      <motion.div style={{ x: mx, y: my }} className="absolute inset-y-0 right-[-6%] w-[100%] md:w-[72%]">
        <WorldMap
          shades={colored ? ALL_SHADES : {}}
          delays={delays}
          bubbles={colored ? HERO_BUBBLES : []}
          className="h-full w-full opacity-60 md:opacity-100"
          label="Carte du monde qui se colorie"
        />
      </motion.div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(244,245,247,.97)_0%,rgba(244,245,247,.9)_38%,rgba(244,245,247,.3)_58%,rgba(244,245,247,0)_72%)] max-md:bg-[linear-gradient(180deg,rgba(244,245,247,.95)_0%,rgba(244,245,247,.75)_55%,rgba(244,245,247,.35)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1400px] flex-col justify-center px-6 pb-40 pt-16 md:px-16">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="inline-flex w-fit items-center gap-2.5 rounded-full border border-[#E3E7EC] bg-white px-4 py-2 text-[15px] text-[#46525E]"
        >
          <span className="h-2 w-2 rounded-full bg-[#C23B2E]" /> Ton passeport de voyage
        </motion.div>

        <h1 className="font-display mt-6 max-w-[820px] text-[52px] leading-[1.02] text-[#111A22] sm:text-[72px] lg:text-[84px]">
          <span className="block overflow-hidden pb-2">
            {words1.map((w, i) => (
              <motion.span key={w} {...wordMotion(i)} className={`${wordCls} mr-[0.25em]`}>
                {w}
              </motion.span>
            ))}
          </span>
          <span className="block overflow-hidden pb-3">
            <motion.span {...wordMotion(2)} className={`${wordCls} font-display-italic mr-[0.25em] text-[#1F5F7B]`}>
              colorie
            </motion.span>
            {words2.map((w, i) => (
              <motion.span key={w} {...wordMotion(3 + i)} className={`${wordCls} mr-[0.25em]`}>
                {w}
              </motion.span>
            ))}
          </span>
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}
          className="mt-6 max-w-[520px] text-[19px] leading-relaxed text-[#46525E]"
        >
          Le monde est gris au départ. Publie un souvenir, et le pays prend sa couleur, reçoit son tampon et rejoint ton passeport.
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 1.1 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <Link
            href="/register"
            className="inline-flex h-14 items-center gap-2 rounded-full bg-[#111A22] px-7 text-[17px] font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#2A3844]"
          >
            Colorier ma première carte <ArrowRight className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => document.getElementById('annees')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex h-14 items-center gap-2 rounded-full border border-[#111A22]/70 px-6 text-[17px] font-medium text-[#111A22] transition hover:bg-white"
          >
            <Play className="h-4 w-4 fill-current" /> Voir la démo
          </button>
        </motion.div>
        <p className="mt-5 text-[15px] text-[#7A8794]">Gratuit · 195 pays à colorier · Aucune carte bancaire</p>
      </div>

      {/* Tampons qui s'impriment une fois la carte colorée */}
      {stamps >= 1 && (
        <div className="absolute right-[3%] top-[18%] z-10 hidden md:block">
          <Stamp country="Japon" date="2024-10-02" animate size={150} />
        </div>
      )}
      {stamps >= 2 && (
        <div className="absolute bottom-[26%] left-[44%] z-10 hidden md:block">
          <Stamp country="Maroc" date="2022-11-05" animate size={150} />
        </div>
      )}

      {/* Compteur */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 1.4 }}
        className="absolute bottom-8 left-6 z-10 flex items-center gap-6 rounded-[28px] border border-[#E3E7EC] bg-white px-7 py-4 shadow-[0_20px_50px_-26px_rgba(17,26,34,0.35)] md:left-16"
      >
        <span className="font-display text-[72px] leading-none text-[#111A22]">
          <Counter to={DEMO.length} run={colored} instant={reduce} />
        </span>
        <div className="w-[230px]">
          <p className="text-[16px] text-[#46525E]">
            pays sur {WORLD_TOTAL}, soit {Math.round((DEMO.length / WORLD_TOTAL) * 100)} %
          </p>
          <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-[#E3E7EC]">
            <motion.div
              className="h-full bg-[#1F5F7B]"
              initial={{ width: 0 }}
              animate={{ width: colored ? `${(DEMO.length / WORLD_TOTAL) * 100}%` : 0 }}
              transition={{ duration: 2.6, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2.5 text-[13px] text-[#7A8794]">
            Prochain badge · <b className="text-[#111A22]">Globe-trotter</b>
          </p>
        </div>
      </motion.div>

      <div className="absolute bottom-10 right-10 z-10 hidden items-center gap-3 text-[15px] text-[#46525E] lg:flex">
        Défile pour voyager
        <span className="flex h-10 w-6 justify-center rounded-full border-[1.8px] border-[#111A22] pt-2">
          <motion.span
            className="h-2 w-1 rounded bg-[#111A22]"
            animate={reduce ? undefined : { y: [0, 12, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
        </span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  2. AU FIL DU SCROLL : la carte se remplit année après année        */
/* ------------------------------------------------------------------ */

function YearsSection({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [year, setYear] = useState(YEARS[0]);
  const [playing, setPlaying] = useState(false);

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const i = Math.min(YEARS.length - 1, Math.max(0, Math.floor(p * YEARS.length * 0.999)));
    setYear(YEARS[i]);
  });

  const yearToY = (y: number) => {
    const el = ref.current;
    if (!el) return 0;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    return top + ((YEARS.indexOf(y) + 0.5) / YEARS.length) * span;
  };

  useEffect(() => {
    if (!playing) return;
    let i = YEARS.indexOf(year) < 0 ? 0 : YEARS.indexOf(year);
    const id = setInterval(() => {
      i += 1;
      if (i >= YEARS.length) {
        setPlaying(false);
        return;
      }
      scrollToY(yearToY(YEARS[i]));
    }, 1300);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const seen = useMemo(() => visitedUntil(DEMO, year), [year]);
  const shades = useMemo(() => shadesOf(seen), [seen]);
  const news = DEMO.filter((v) => Number(v.firstDate.slice(0, 4)) === year);

  return (
    <section id="annees" ref={ref} className="relative bg-[#F4F5F7]" style={{ height: reduce ? 'auto' : '320vh' }}>
      <div className={`${reduce ? '' : 'sticky top-0 h-screen'} overflow-hidden`}>
        <div className="mx-auto grid h-full max-w-[1400px] items-center gap-8 px-6 py-10 md:px-16 lg:grid-cols-[480px_1fr]">
          <div>
            <Eyebrow>02 — Au fil du scroll</Eyebrow>
            <h2 className="font-display mt-3 text-[40px] leading-[1.04] text-[#111A22] sm:text-[52px]">
              Ta carte se remplit, <span className="font-display-italic text-[#1F5F7B]">année après année.</span>
            </h2>
            <div className="font-display mt-4 overflow-hidden text-[110px] leading-[0.95] tracking-tight text-[#1F5F7B] lg:text-[150px]">
              <motion.span key={year} initial={reduce ? false : { y: '55%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: EASE }} className="inline-block">
                {year}
              </motion.span>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-[44px] leading-none">{seen.length}</span>
              <span className="text-[17px] text-[#46525E]">
                pays · {Math.round((seen.length / WORLD_TOTAL) * 100)} % du monde
              </span>
            </div>
            <div className="mt-3 h-[5px] w-[320px] max-w-full overflow-hidden rounded-full bg-[#E3E7EC]">
              <div className="h-full bg-[#1F5F7B] transition-all duration-700" style={{ width: `${Math.max(2, (seen.length / WORLD_TOTAL) * 100)}%` }} />
            </div>
            <p className="mb-1 mt-6 text-[15px] text-[#7A8794]">Nouveaux tampons en {year}</p>
            <div className="flex min-h-[130px] flex-wrap gap-1">
              {news.map((v) => (
                <Stamp key={`${year}-${v.numeric}`} country={v.name} date={v.firstDate} animate size={118} />
              ))}
            </div>
          </div>

          <div className="relative h-[52vh] min-h-[340px] overflow-hidden rounded-[28px] border border-[#E3E7EC] bg-white shadow-[0_30px_70px_-40px_rgba(17,26,34,0.35)] lg:h-[74vh]">
            <WorldMap shades={shades} className="h-full w-full" label={`Pays visités jusqu'en ${year}`} />
            <div className="absolute inset-x-0 bottom-5 flex justify-center px-3">
              <MapTimeline
                years={YEARS}
                year={year}
                playing={playing}
                onSelect={(y) => {
                  setPlaying(false);
                  scrollToY(yearToY(y));
                  setYear(y);
                }}
                onTogglePlay={() => {
                  if (!playing) scrollToY(yearToY(YEARS[0]));
                  setPlaying((p) => !p);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  3. LE PASSEPORT                                                    */
/* ------------------------------------------------------------------ */

const PASSPORT_STAMPS = [
  { c: 'Tunisie', d: '2021-08-14' },
  { c: 'Japon', d: '2024-10-02' },
  { c: 'Islande', d: '2025-02-11' },
  { c: 'Portugal', d: '2022-04-09' },
  { c: 'Italie', d: '2019-08-10' },
  { c: 'Maroc', d: '2022-11-05' },
];

function PassportSection({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-25% 0px' });
  const [step, setN] = useState(0);
  const n = reduce ? PASSPORT_STAMPS.length + 1 : step;

  useEffect(() => {
    if (!inView || reduce) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i > PASSPORT_STAMPS.length) clearInterval(id);
    }, 420);
    return () => clearInterval(id);
  }, [inView, reduce]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const rotate = useTransform(scrollYProgress, [0.1, 0.5], reduce ? [-4, -4] : [-16, -4]);
  const lift = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [0, 0, 0] : [60, 0, -40]);

  const mini = useMemo(() => shadesOf(DEMO.filter((v) => ['250', '380', '276', '826', '620', '788', '504', '392', '352'].includes(v.numeric))), []);
  const points = [
    { icon: StampIcon, t: 'Un tampon daté', s: 'Dès ton premier souvenir dans un nouveau pays.' },
    { icon: Award, t: 'Des badges à 5, 10 et 25 pays', s: 'Un cap à viser, toujours visible dans ton profil.' },
    { icon: Navigation, t: 'Le prochain pays déjà suggéré', s: 'Les voisins de tes tampons, prêts à être coloriés.' },
  ];

  return (
    <section ref={ref} className="overflow-hidden bg-[#F4F5F7] py-24">
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-6 md:px-16 lg:grid-cols-[500px_1fr]">
        <Reveal>
          <Eyebrow>03 — Le passeport</Eyebrow>
          <h2 className="font-display mt-3 text-[42px] leading-[1.05] text-[#111A22] sm:text-[56px]">
            Ton <span className="font-display-italic text-[#1F5F7B]">passeport</span>, tamponné à chaque premier souvenir.
          </h2>
          <ul className="mt-8 space-y-6">
            {points.map(({ icon: Icon, t, s }) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E3EDF2]">
                  <Icon className="h-5 w-5 text-[#1F5F7B]" />
                </span>
                <div>
                  <p className="text-[19px] font-semibold text-[#111A22]">{t}</p>
                  <p className="text-[16px] text-[#46525E]">{s}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/my-map" className="mt-9 inline-flex h-14 items-center rounded-full bg-[#111A22] px-7 text-[17px] font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#2A3844]">
            Ouvrir mon passeport
          </Link>
        </Reveal>

        <motion.div style={{ y: lift }} className="relative mx-auto h-[420px] w-full max-w-[760px] sm:h-[520px]" aria-hidden>
          {/* Couverture */}
          <div className="absolute left-0 top-[12%] h-[76%] w-[38%] -rotate-[8deg] rounded-l-2xl rounded-r-lg bg-gradient-to-br from-[#14485E] to-[#0A2530] shadow-[0_30px_60px_-20px_rgba(10,37,48,0.6)]">
            <p className="mt-[16%] text-center font-display text-[15px] tracking-[0.34em] text-[#C9A85C]">PASSEPORT</p>
          </div>
          {/* Double page */}
          <motion.div
            style={{ rotateY: rotate, transformPerspective: 1800 }}
            className="absolute right-0 top-0 flex h-[88%] w-[84%] overflow-hidden rounded-2xl bg-[#FBFAF6] shadow-[0_50px_80px_-34px_rgba(17,26,34,0.55)]"
          >
            <div className="relative flex-1 border-r border-[#E3E7EC] p-4 sm:p-6">
              <p className="font-display text-[20px] sm:text-[24px]">Pays explorés</p>
              <div className="mt-3 h-[34%] overflow-hidden rounded-xl border border-[#E3E7EC] bg-[#F4F5F7]">
                <WorldMap shades={mini} focus={['250', '380', '276', '826', '620', '788', '504']} focusMaxZoom={3} className="h-full w-full" />
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="font-display text-[56px] leading-none sm:text-[80px]">
                  <Counter to={DEMO.length} run={n > 0} instant={reduce} />
                </span>
                <p className="pb-1 text-right text-[12px] leading-snug text-[#7A8794]">
                  Premier voyage<br />
                  <b className="text-[13px] text-[#111A22]">France, mars 2019</b>
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {[5, 10, 25].map((b) => (
                  <span
                    key={b}
                    className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-[16px] ${
                      DEMO.length >= b ? 'bg-[#111A22] text-white ring-2 ring-inset ring-[#C9A85C]' : 'border border-dashed border-[#B9C3CC] text-[#B9C3CC]'
                    }`}
                  >
                    {b}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-[#B9C3CC] bg-white/70 p-2">
                <Stamp country="Espagne" ghost size={46} />
                <p className="text-[12px] leading-tight text-[#46525E]">
                  <b className="text-[13px] text-[#111A22]">Prochain tampon : Espagne</b>
                  <br />
                  Publie un souvenir là-bas.
                </p>
              </div>
            </div>
            <div className="relative grid flex-1 grid-cols-2 content-start gap-1 p-3 sm:p-5">
              <p className="col-span-2 font-display text-[20px] sm:text-[24px]">Tampons</p>
              {PASSPORT_STAMPS.map((s, i) => (
                <div key={s.c} className="flex min-h-[84px] items-center justify-center sm:min-h-[110px]">
                  {n > i && <Stamp country={s.c} date={s.d} animate size={104} />}
                </div>
              ))}
            </div>
          </motion.div>
          {/* Le tampon qui tombe */}
          {n > PASSPORT_STAMPS.length && (
            <div className="absolute -top-2 right-[8%] z-10 opacity-80">
              <Stamp country="Espagne" date="2026-11-06" animate size={130} />
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  4. BENTO + chiffres + appel à l'action                             */
/* ------------------------------------------------------------------ */

function Tile({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={`relative overflow-hidden rounded-[32px] border border-[#E3E7EC] bg-white ${className}`}
    >
      {children}
    </motion.div>
  );
}

function TileHead({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-7 pt-7">
      <h3 className="font-display text-[30px] leading-[1.05] text-[#111A22]">{title}</h3>
      <p className="mt-2 text-[16px] leading-snug text-[#46525E]">{text}</p>
    </div>
  );
}

function BentoSection() {
  const next = [
    { n: 'Espagne', s: 'Voisine de la France et du Portugal' },
    { n: 'Algérie', s: 'Voisine de la Tunisie et du Maroc' },
    { n: 'Libye', s: 'Voisine de la Tunisie et de l’Égypte' },
  ];
  return (
    <section className="bg-[#F4F5F7] px-6 pb-10 pt-16 md:px-16">
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="text-center">
          <Eyebrow>04 — Tout ce qui colorie ton voyage</Eyebrow>
          <h2 className="font-display mt-3 text-[44px] leading-[1.03] text-[#111A22] sm:text-[68px]">
            Une carte, un passeport, <span className="font-display-italic text-[#1F5F7B]">et des amis.</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <Tile className="min-h-[520px] lg:row-span-2">
            <TileHead title="Ta carte du monde" text="Grise au départ. Chaque pays visité prend une couleur, plus foncée à chaque souvenir." />
            <WorldMap shades={ALL_SHADES} className="absolute inset-x-0 bottom-0 h-[68%]" label="Carte du monde colorée" />
          </Tile>

          <Tile delay={0.1}>
            <TileHead title="Le fil de tes amis" text="Un nouveau pays sur leur carte ? Tu le vois passer, avec son tampon." />
            <div className="p-7 pt-5">
              <div className="mb-4 flex gap-3">
                {[PHOTO.tokyo, PHOTO.bali, PHOTO.paris, PHOTO.swiss].map((p) => (
                  <span key={p} className="block rounded-full bg-[#111A22] p-[3px]">
                    <span className="block overflow-hidden rounded-full border-2 border-white">
                      <SmartImage src={p} alt="" className="h-[48px] w-[48px] object-cover" />
                    </span>
                  </span>
                ))}
              </div>
              <div className="overflow-hidden rounded-[20px] border border-[#E3E7EC]">
                <div className="flex items-center gap-3 px-4 py-3">
                  <SmartImage src={PHOTO.paris} alt="" className="h-10 w-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold">Yasmine Gharbi</p>
                    <p className="text-[13px] text-[#46525E]">Paris, France</p>
                  </div>
                  <span className="rounded-full border border-[#E3D3A6] bg-[#FBF6EA] px-3 py-1.5 text-[12px] font-semibold text-[#8A6D2F]">
                    Nouveau pays sur sa carte
                  </span>
                </div>
                <SmartImage src={PHOTO.paris} alt="" className="h-[160px] w-full object-cover" />
              </div>
            </div>
          </Tile>

          <div className="grid gap-6 sm:grid-cols-2">
            <Tile delay={0.15}>
              <TileHead title="Des badges" text="5, 10 et 25 pays." />
              <div className="flex justify-center gap-3 p-6 pt-5">
                {[
                  { n: 5, l: 'Explorateur', on: true },
                  { n: 10, l: 'Aventurier', on: true },
                  { n: 25, l: 'Globe-trotter', on: false },
                ].map((b, i) => (
                  <motion.div
                    key={b.n}
                    initial={{ scale: 0.4, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.3 + i * 0.15 }}
                    className="text-center"
                  >
                    <span
                      className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full font-display text-[30px] ${
                        b.on ? 'bg-[#111A22] text-white ring-[3px] ring-inset ring-[#C9A85C]' : 'border-2 border-dashed border-[#B9C3CC] text-[#B9C3CC]'
                      }`}
                    >
                      {b.n}
                    </span>
                    <p className={`mt-2 text-[12px] ${b.on ? 'font-semibold text-[#111A22]' : 'text-[#7A8794]'}`}>{b.l}</p>
                  </motion.div>
                ))}
              </div>
            </Tile>
            <Tile delay={0.2}>
              <TileHead title="À colorier ensuite" text="Les voisins de tes tampons." />
              <ul className="px-7 pb-6 pt-3">
                {next.map((x) => (
                  <li key={x.n} className="border-t border-[#E3E7EC] py-2.5">
                    <p className="text-[17px] font-semibold">{x.n}</p>
                    <p className="text-[13px] text-[#7A8794]">{x.s}</p>
                  </li>
                ))}
              </ul>
            </Tile>
          </div>
        </div>

        <div className="grid gap-10 px-4 py-24 text-center sm:grid-cols-3">
          {[
            { v: '195', l: 'pays à colorier' },
            { v: '1', l: 'tampon par nouveau pays' },
            { v: '∞', l: 'souvenirs à raconter' },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 0.12}>
              <p className="font-display text-[88px] leading-none text-[#111A22] sm:text-[112px]">{s.v}</p>
              <p className="mt-2 text-[18px] text-[#46525E]">{s.l}</p>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="relative overflow-hidden rounded-[44px] bg-[#0F3342] px-6 py-24 text-center text-white sm:py-32">
            <WorldMap shades={ALL_SHADES} className="absolute inset-0 h-full w-full opacity-25" label="" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,51,66,.94)_0%,rgba(15,51,66,.6)_45%,rgba(15,51,66,.05)_85%)]" />
            <div className="relative">
              <h2 className="font-display text-[52px] leading-[0.98] sm:text-[100px]">
                À toi de colorier
                <br />
                <span className="font-display-italic text-[#C9A85C]">le monde.</span>
              </h2>
              <p className="mt-6 text-[19px] text-[#B9D2DC]">Crée ton passeport gratuitement. Ton premier pays t’attend.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/register" className="inline-flex h-14 items-center rounded-full bg-white px-8 text-[17px] font-medium text-[#111A22] transition hover:-translate-y-0.5">
                  Commencer gratuitement
                </Link>
                <Link href="/my-map" className="inline-flex h-14 items-center rounded-full border-[1.5px] border-white/60 px-7 text-[17px] font-medium text-white transition hover:bg-white/10">
                  Explorer la carte
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  const reduce = useReducedMotion() ?? false;
  return (
    <>
      <Hero reduce={reduce} />
      <YearsSection reduce={reduce} />
      <PassportSection reduce={reduce} />
      <BentoSection />
    </>
  );
}