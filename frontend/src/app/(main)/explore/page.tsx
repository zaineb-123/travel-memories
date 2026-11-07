'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { MemoryCard } from '@/components/memories/MemoryCard';
import { Input } from '@/components/ui/input';
import { memoriesApi } from '@/lib/api/memories';
import type { Memory } from '@/types';

const PAGE_SIZE = 24;

function ExploreContent() {
  const params = useSearchParams();
  const tag = params.get('tag') ?? undefined;
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const sentinel = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (p: number) => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const res = await memoriesApi.list({ page: p, limit: PAGE_SIZE, search: debounced || undefined, tag, sort });
        if (id !== requestId.current) return;
        setMemories((prev) => (p === 1 ? res.data.memories : [...prev, ...res.data.memories]));
        setHasMore(res.data.pagination.hasMore);
      } catch {
        if (id === requestId.current) setHasMore(false);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [debounced, tag, sort],
  );

  useEffect(() => {
    setPage(1);
    void load(1);
  }, [load]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const next = page + 1;
          setPage(next);
          void load(next);
        }
      },
      { rootMargin: '400px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, page, load]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-[#111A22]">Explorer les voyages</h1>
        <p className="text-[#46525E]">Découvrez les aventures des voyageurs du monde entier</p>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8794]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un voyage, pays, ville, #tag…" className="pl-10" />
        </div>
        <div className="flex rounded-lg bg-white p-1 text-sm">
          {(['recent', 'popular'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`rounded-md px-3 py-1 ${sort === s ? 'bg-[#1F5F7B] text-white' : 'text-[#46525E]'}`}
            >
              {s === 'recent' ? 'Récents' : 'Populaires'}
            </button>
          ))}
        </div>
        {tag && (
          <a href="/explore" className="flex items-center gap-1 rounded-full bg-[#E3EDF2] px-3 py-1 text-sm text-[#1F5F7B]">
            #{tag} <X className="h-3 w-3" />
          </a>
        )}
      </div>

      {memories.length === 0 && !loading ? (
        <div className="py-20 text-center text-[#7A8794]">Aucun voyage trouvé</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} />
          ))}
        </div>
      )}

      <div ref={sentinel} className="flex justify-center py-8">
        {loading && <Loader2 className="h-6 w-6 animate-spin text-[#1F5F7B]" />}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreContent />
    </Suspense>
  );
}
