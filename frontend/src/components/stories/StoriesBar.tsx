'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StoryViewer } from './StoryViewer';
import { CreateStoryDialog } from './CreateStoryDialog';
import { storiesApi } from '@/lib/api/stories';
import { useAuthStore } from '@/store/authStore';
import type { StoryGroup } from '@/types/social';

/** Bandeau de stories (24 h) en haut du fil : les miennes, puis celles des voyageurs que je suis. */
export function StoriesBar() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await storiesApi.feed();
      setGroups(res.data ?? []);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  const mine = groups.find((g) => g.user.id === user.id);
  const others = groups.filter((g) => g.user.id !== user.id);
  const ordered = mine ? [mine, ...others] : others;

  const openGroup = (g: StoryGroup) => setViewerAt(ordered.findIndex((x) => x.user.id === g.user.id));

  return (
    <>
      <div className="no-scrollbar mb-6 flex gap-5 overflow-x-auto px-1 py-1">
        {/* Ma story */}
        <div className="flex w-[84px] shrink-0 flex-col items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => (mine ? openGroup(mine) : setCreateOpen(true))}
              className={`rounded-full p-[2px] ${mine ? 'bg-[#111A22]' : 'bg-[#E3E7EC]'}`}
              aria-label={mine ? 'Voir ma story' : 'Ajouter une story'}
            >
              <span className="block rounded-full bg-white p-[2px]">
                <Avatar className="h-[72px] w-[72px]">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">
                    {(user.full_name || user.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              aria-label="Ajouter une story"
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#1F5F7B] text-white"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <span className="w-full truncate text-center text-[15px] text-[#46525E]">Ton story</span>
        </div>

        {others.map((g) => (
          <button key={g.user.id} type="button" onClick={() => openGroup(g)} className="flex w-[84px] shrink-0 flex-col items-center gap-1">
            <span className={`rounded-full p-[2px] ${g.has_unseen ? 'bg-[#111A22]' : 'bg-[#C9D1D8]'}`}>
              <span className="block rounded-full bg-white p-[2px]">
                <Avatar className="h-[72px] w-[72px]">
                  <AvatarImage src={g.user.avatar_url} />
                  <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{g.user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </span>
            </span>
            <span className={`w-full truncate text-center text-[15px] ${g.has_unseen ? 'font-medium text-[#111A22]' : 'text-[#7A8794]'}`}>
              {g.user.username}
            </span>
          </button>
        ))}

        {others.length === 0 && !mine && (
          <p className="self-center pl-2 text-xs text-[#7A8794]">
            Partagez un moment de voyage : il reste visible 24 h. Les stories des voyageurs que vous suivez apparaîtront ici.
          </p>
        )}
      </div>

      {viewerAt !== null && ordered[viewerAt] && (
        <StoryViewer
          groups={ordered}
          startGroup={viewerAt}
          currentUserId={user.id}
          onClose={() => {
            setViewerAt(null);
            void load();
          }}
        />
      )}
      <CreateStoryDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
    </>
  );
}
