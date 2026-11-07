'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bookmark, BookOpen, Grid3x3, Loader2, Lock, MapIcon, UserRoundCheck, UserX } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { profileApi } from '@/lib/api/profile';
import { memoriesApi } from '@/lib/api/memories';
import { socialApi } from '@/lib/api/social';
import { storiesApi } from '@/lib/api/stories';
import { getErrorMessage } from '@/lib/api/errors';
import { useTravelStats } from '@/hooks/useTravelStats';
import { PassportSpread } from '@/components/passport/PassportSpread';
import { WorldMap } from '@/components/passport/WorldMap';
import { shadesOf } from '@/lib/travel';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { MemoryCard } from '@/components/memories/MemoryCard';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { Button } from '@/components/ui/button';
import type { Memory, User } from '@/types';
import type { FollowStatus, Story, StoryGroup } from '@/types/social';

type Tab = 'passport' | 'memories' | 'map' | 'saved' | 'tagged';
type ListTab = 'memories' | 'saved' | 'tagged';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = decodeURIComponent(params.username as string);
  const { user: currentUser, isAuthenticated, setUser } = useAuthStore();

  const [profile, setProfile] = useState<User | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('none');
  const [isFriend, setIsFriend] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [tab, setTab] = useState<Tab>('passport');
  const [items, setItems] = useState<Record<ListTab, Memory[]>>({ memories: [], tagged: [], saved: [] });
  const [tabLoading, setTabLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const [stories, setStories] = useState<Story[]>([]);
  const [storyOpen, setStoryOpen] = useState(false);
  const [pending, setPending] = useState(0);

  const travel = useTravelStats(profile?.username);
  const isOwn = !!currentUser && currentUser.username.toLowerCase() === username.toLowerCase();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await profileApi.getByUsername(username);
      setProfile(res.data.user);
      setFollowStatus(res.data.follow_status ?? (res.data.is_following ? 'following' : 'none'));
      setIsFriend(!!res.data.is_friend);
      setIsBlocked(!!res.data.is_blocked);
    } catch {
      setNotFound(true);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void loadProfile();
    // Le jeton est envoyé automatiquement : on voit donc ses propres souvenirs privés / « abonnés ».
  }, [loadProfile, isAuthenticated]);

  // Stories 24 h du voyageur + demandes en attente (compte privé, vue personnelle)
  useEffect(() => {
    setStories([]);
    if (!isAuthenticated) return;
    storiesApi.byUser(username).then((r) => setStories(r.data ?? [])).catch(() => undefined);
    if (isOwn) socialApi.requests().then((r) => setPending(r.count ?? r.data?.length ?? 0)).catch(() => undefined);
  }, [username, isAuthenticated, isOwn]);

  const loadTab = useCallback(
    async (which: ListTab, p: number) => {
      setTabLoading(true);
      try {
        let list: Memory[] = [];
        let more = false;
        if (which === 'memories') {
          const r = await memoriesApi.byUser(username, p);
          list = r.data ?? [];
          more = !!r.pagination?.hasMore;
        } else if (which === 'saved') {
          const r = await memoriesApi.favorites(p);
          list = r.data.memories ?? [];
          more = r.data.pagination.hasMore;
        } else {
          const r = await socialApi.tagged(username, p);
          const d: any = r.data;
          list = Array.isArray(d) ? d : (d?.memories ?? []);
          more = !!(r as any).pagination?.hasMore;
        }
        setItems((prev) => ({ ...prev, [which]: p === 1 ? list : [...prev[which], ...list] }));
        setHasMore(more);
      } catch {
        if (p === 1) setItems((prev) => ({ ...prev, [which]: [] }));
        setHasMore(false);
      } finally {
        setTabLoading(false);
      }
    },
    [username],
  );

  // Les souvenirs alimentent aussi « Derniers souvenirs publics » : on les charge dès l'ouverture du profil.
  useEffect(() => {
    if (!profile || isBlocked) return;
    void loadTab('memories', 1);
  }, [profile, isBlocked, isAuthenticated, loadTab]);

  useEffect(() => {
    if (!profile || isBlocked || (tab !== 'saved' && tab !== 'tagged')) return;
    setPage(1);
    void loadTab(tab, 1);
  }, [profile, tab, isBlocked, loadTab]);

  const onFollowChange = (next: FollowStatus, prev: FollowStatus) => {
    setFollowStatus(next);
    setProfile((p) =>
      p ? { ...p, followers_count: Math.max(0, p.followers_count + (next === 'following' ? 1 : 0) - (prev === 'following' ? 1 : 0)) } : p,
    );
    // Les souvenirs d'un compte privé deviennent visibles dès que l'abonnement est accepté.
    if (next === 'following' || prev === 'following') void loadProfile();
  };

  const block = async () => {
    if (!profile || !window.confirm(`Bloquer @${profile.username} ? Vous ne verrez plus son contenu et il ne verra plus le vôtre.`)) return;
    try {
      await socialApi.block(profile.id);
      setIsBlocked(true);
      setFollowStatus('none');
    } catch (e) {
      window.alert(getErrorMessage(e));
    }
  };

  const unblock = async () => {
    if (!profile) return;
    try {
      await socialApi.unblock(profile.id);
      setIsBlocked(false);
      void loadProfile();
    } catch (e) {
      window.alert(getErrorMessage(e));
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1F5F7B]" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <UserX className="mx-auto mb-3 h-12 w-12 text-[#B9C3CC]" />
        <h1 className="text-xl font-semibold text-[#111A22]">Voyageur introuvable</h1>
        <p className="mt-1 text-[#7A8794]">Ce profil n&apos;existe pas ou n&apos;est pas accessible.</p>
        <Button className="mt-4 bg-[#1F5F7B] text-white hover:bg-[#174B62]" onClick={() => router.push('/explore')}>
          Explorer
        </Button>
      </div>
    );
  }

  const storyGroup: StoryGroup | null = stories.length
    ? {
        user: stories[0].user,
        stories,
        has_unseen: stories.some((s) => !s.seen && s.user_id !== currentUser?.id),
      }
    : null;

  const locked = !!profile.is_private && !isOwn && followStatus !== 'following';
  const tabs: { id: Tab; label: string; icon: typeof Grid3x3 }[] = [
    { id: 'passport', label: 'Passeport', icon: BookOpen },
    { id: 'memories', label: 'Souvenirs', icon: Grid3x3 },
    { id: 'map', label: 'Carte', icon: MapIcon },
    ...(isOwn ? [{ id: 'saved' as const, label: 'Favoris', icon: Bookmark }] : []),
    { id: 'tagged', label: 'Identifié(e)', icon: UserRoundCheck },
  ];
  const listTab = tab === 'memories' || tab === 'saved' || tab === 'tagged' ? tab : null;

  const stats = travel.stats;

  return (
    <div>
      <div className="mx-auto grid max-w-[1480px] gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-14 lg:px-10">
        <aside>
          <ProfileHeader
            user={profile}
            isOwnProfile={isOwn}
            followStatus={followStatus}
            isFriend={isFriend}
            hasStory={!!storyGroup}
            storyUnseen={!!storyGroup?.has_unseen}
            pendingRequests={pending}
            recent={locked || isBlocked ? [] : items.memories}
            onOpenStory={() => setStoryOpen(true)}
            onFollowChange={onFollowChange}
            onBlock={block}
            onUpdate={(data) => {
              setProfile((p) => (p ? { ...p, ...data } : p));
              if (isOwn) setUser({ ...(currentUser as any), ...data });
            }}
            onFollowerRemoved={() => setProfile((p) => (p ? { ...p, followers_count: Math.max(0, p.followers_count - 1) } : p))}
          />
        </aside>

        <div className="min-w-0">
          {isBlocked ? (
            <div className="rounded-[24px] border border-[#E3E7EC] bg-white p-10 text-center">
              <UserX className="mx-auto mb-3 h-10 w-10 text-[#B9C3CC]" />
              <p className="font-semibold text-[#111A22]">Vous avez bloqué @{profile.username}</p>
              <p className="mt-1 text-sm text-[#7A8794]">Son contenu et ses messages sont masqués.</p>
              <Button variant="outline" className="mt-4" onClick={unblock}>
                Débloquer
              </Button>
            </div>
          ) : locked ? (
            <div className="rounded-[24px] border border-[#E3E7EC] bg-white p-10 text-center">
              <Lock className="mx-auto mb-3 h-10 w-10 text-[#B9C3CC]" />
              <p className="font-semibold text-[#111A22]">Ce compte est privé</p>
              <p className="mt-1 text-sm text-[#7A8794]">
                {followStatus === 'requested'
                  ? 'Votre demande est en attente de validation.'
                  : 'Suivez ce voyageur pour voir son passeport, ses souvenirs et ses stories.'}
              </p>
            </div>
          ) : (
            <>
              <div className="no-scrollbar mb-5 flex gap-8 overflow-x-auto" role="tablist">
                {tabs.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`shrink-0 border-b-2 pb-1.5 text-[18px] transition ${
                      tab === id ? 'border-[#111A22] font-medium text-[#111A22]' : 'border-transparent text-[#46525E] hover:text-[#111A22]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'passport' &&
                (travel.loading ? (
                  <div className="flex justify-center py-24">
                    <Loader2 className="h-7 w-7 animate-spin text-[#1F5F7B]" />
                  </div>
                ) : stats ? (
                  <PassportSpread user={profile} stats={stats} visited={travel.visited} isOwn={isOwn} />
                ) : (
                  <p className="py-16 text-center text-[#7A8794]">Le passeport n’est pas disponible pour le moment.</p>
                ))}

              {tab === 'map' && (
                <div className="overflow-hidden rounded-[24px] border border-[#E3E7EC] bg-white">
                  <WorldMap
                    shades={shadesOf(travel.visited)}
                    interactive
                    label={`Carte de ${profile.full_name}`}
                    className="h-[420px] sm:h-[560px]"
                  />
                </div>
              )}

              {listTab && (
                <>
                  {tabLoading && items[listTab].length === 0 ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-[#1F5F7B]" />
                    </div>
                  ) : items[listTab].length === 0 ? (
                    <div className="py-14 text-center text-[#7A8794]">
                      {tab === 'memories' && (isOwn ? "Vous n'avez pas encore publié de souvenir." : 'Aucun souvenir publié')}
                      {tab === 'saved' && 'Aucun souvenir enregistré'}
                      {tab === 'tagged' && 'Aucun souvenir où ce voyageur est identifié'}
                      {tab === 'memories' && isOwn && (
                        <div className="mt-4">
                          <Button className="rounded-xl bg-[#111A22] text-white hover:bg-[#2A3844]" onClick={() => router.push('/create')}>
                            Partager mon premier souvenir
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                        {items[listTab].map((m) => (
                          <MemoryCard key={m.id} memory={m} />
                        ))}
                      </div>
                      {hasMore && (
                        <div className="mt-6 flex justify-center">
                          <Button
                            variant="outline"
                            disabled={tabLoading}
                            onClick={() => {
                              const next = page + 1;
                              setPage(next);
                              void loadTab(listTab, next);
                            }}
                          >
                            {tabLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Charger plus
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {storyOpen && storyGroup && currentUser && (
        <StoryViewer
          groups={[storyGroup]}
          startGroup={0}
          currentUserId={currentUser.id}
          onClose={() => {
            setStoryOpen(false);
            storiesApi.byUser(username).then((r) => setStories(r.data ?? [])).catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}
