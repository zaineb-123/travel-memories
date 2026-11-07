'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { FeedCard } from '@/components/feed/FeedCard';
import { PassportAside, StampsAside } from '@/components/feed/FeedAside';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { Button } from '@/components/ui/button';
import { memoriesApi } from '@/lib/api/memories';
import type { Memory } from '@/types';

type Tab = 'public' | 'following';
const PAGE_SIZE = 10;

export default function FeedPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<Tab>('public');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (nextTab: Tab, nextPage: number) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const res = await memoriesApi.list({
          page: nextPage,
          limit: PAGE_SIZE,
          feed: nextTab === 'following' ? 'following' : undefined,
        });
        if (id !== requestId.current) return; // une requête plus récente a pris le relais
        const { memories: items, pagination } = res.data;
        setMemories((prev) => (nextPage === 1 ? items : [...prev, ...items]));
        setHasMore(pagination.hasMore);
      } catch (e: any) {
        if (id !== requestId.current) return;
        setError(e?.message || 'Impossible de charger le fil');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [],
  );

  // Changement d'onglet (ou de connexion) : on repart de la page 1.
  useEffect(() => {
    setPage(1);
    setMemories([]);
    void load(tab, 1);
  }, [tab, isAuthenticated, load]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    void load(tab, next);
  }, [loading, hasMore, page, tab, load]);

  // Chargement automatique en bas de page (défilement infini).
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: '400px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const selectTab = (next: Tab) => {
    if (next === 'following' && !isAuthenticated) return router.push('/login');
    setTab(next);
  };

  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-16 sm:px-6 lg:px-10">
      <div className={`grid gap-8 ${isAuthenticated && user ? 'lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[320px_minmax(0,1fr)_340px] xl:gap-10' : ''}`}>
        {/* Colonne de gauche : mon passeport fermé */}
        {isAuthenticated && user && (
          <aside className="hidden xl:block">
            <div className="sticky top-24">
              <PassportAside user={user} />
            </div>
          </aside>
        )}

        {/* Centre : stories puis publications */}
        <div className="mx-auto w-full max-w-[720px]">
          <h1 className="sr-only">Fil d&apos;actualité</h1>
          {isAuthenticated && <StoriesBar />}

          <div className="mb-5 flex gap-6 border-b border-[#E3E7EC]" role="tablist">
            {(
              [
                ['public', 'Découvrir'],
                ['following', 'Abonnements'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => selectTab(key)}
                className={`-mb-px border-b-2 pb-2.5 text-[17px] transition ${
                  tab === key ? 'border-[#111A22] font-medium text-[#111A22]' : 'border-transparent text-[#46525E] hover:text-[#111A22]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {!isAuthenticated && (
            <div className="mb-5 rounded-[20px] border border-[#E3E7EC] bg-white p-5 text-[15px] text-[#46525E]">
              <Link href="/login" className="font-semibold text-[#111A22] underline">
                Connecte-toi
              </Link>{' '}
              pour aimer, commenter, partager et suivre des voyageurs.
            </div>
          )}

          {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {memories.length === 0 && loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#1F5F7B]" />
            </div>
          ) : memories.length === 0 ? (
            <div className="rounded-[20px] border border-[#E3E7EC] bg-white p-10 text-center">
              <TrendingUp className="mx-auto mb-3 h-12 w-12 text-[#B9C3CC]" />
              <h3 className="font-display mb-2 text-[28px] text-[#111A22]">Rien à voir pour l&apos;instant</h3>
              <p className="mb-5 text-[#7A8794]">
                {tab === 'following'
                  ? 'Suis d’autres voyageurs pour voir leurs aventures ici.'
                  : 'Sois le premier à partager ton voyage.'}
              </p>
              <Button onClick={() => router.push(tab === 'following' ? '/explore' : '/create')} className="rounded-xl bg-[#111A22] px-6 text-white hover:bg-[#2A3844]">
                {tab === 'following' ? 'Explorer des voyageurs' : 'Partager un souvenir'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {memories.map((m) => (
                <FeedCard key={m.id} memory={m} />
              ))}
              <div ref={sentinel} className="flex justify-center py-4">
                {loading && <Loader2 className="h-6 w-6 animate-spin text-[#1F5F7B]" />}
                {!loading && !hasMore && <p className="text-sm text-[#7A8794]">Tu as tout vu.</p>}
              </div>
            </div>
          )}
        </div>

        {/* Colonne de droite : tampons des amis, pays à colorier */}
        {isAuthenticated && user && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <StampsAside user={user} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
