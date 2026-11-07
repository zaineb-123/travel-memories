'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ban, Calendar, Edit2, Heart, Lock, MapPin, MessageCircle, MoreHorizontal, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/ui/SmartImage';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FollowButton } from '@/components/social/FollowButton';
import { FollowListDialog } from '@/components/social/FollowListDialog';
import { EditProfileModal } from './EditProfileModal';
import { formatNumber } from '@/lib/utils';
import type { Memory, User } from '@/types';
import type { FollowStatus } from '@/types/social';

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  followStatus: FollowStatus;
  isFriend: boolean;
  hasStory: boolean;
  storyUnseen: boolean;
  pendingRequests?: number;
  /** Derniers souvenirs publics, affichés sous le profil. */
  recent?: Memory[];
  onOpenStory: () => void;
  onFollowChange: (next: FollowStatus, previous: FollowStatus) => void;
  onBlock: () => void;
  onUpdate: (data: Partial<User>) => void;
  onFollowerRemoved: () => void;
}

export function ProfileHeader({
  user,
  isOwnProfile,
  followStatus,
  isFriend,
  hasStory,
  storyUnseen,
  pendingRequests = 0,
  recent = [],
  onOpenStory,
  onFollowChange,
  onBlock,
  onUpdate,
  onFollowerRemoved,
}: ProfileHeaderProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [list, setList] = useState<'followers' | 'following' | null>(null);
  const canSeeLists = !user.is_private || isOwnProfile || followStatus === 'following';

  const stats: { label: string; value: number; onClick?: () => void }[] = [
    { label: 'Souvenirs', value: user.memories_count },
    { label: 'Abonnés', value: user.followers_count, onClick: canSeeLists ? () => setList('followers') : undefined },
    { label: 'Abonnements', value: user.following_count, onClick: canSeeLists ? () => setList('following') : undefined },
  ];

  const initial = (user.full_name || user.username).charAt(0).toUpperCase();

  return (
    <>
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        {/* Avatar avec anneau de story */}
        <button
          type="button"
          onClick={hasStory ? onOpenStory : undefined}
          aria-label={hasStory ? 'Voir la story' : undefined}
          className={`rounded-full p-[3px] ${hasStory ? (storyUnseen ? 'bg-[#111A22]' : 'bg-[#C9D1D8]') : 'bg-transparent'} ${hasStory ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className={`block rounded-full ${hasStory ? 'bg-[#F4F5F7] p-[3px]' : ''}`}>
            <Avatar className="h-32 w-32 sm:h-[156px] sm:w-[156px]">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-[#E3EDF2] text-4xl text-[#1F5F7B]">{initial}</AvatarFallback>
            </Avatar>
          </span>
        </button>

        <h1 className="font-display mt-6 flex items-center gap-3 text-[44px] leading-[1.05] text-[#111A22] sm:text-[56px]">
          {user.full_name}
          {user.is_private && <Lock className="h-5 w-5 text-[#7A8794]" aria-label="Compte privé" />}
        </h1>
        <p className="mt-2 text-[17px] text-[#7A8794]">
          @{user.username}
          {isFriend && <span className="ml-2 rounded-full bg-[#E3EDF2] px-2 py-0.5 text-xs text-[#1F5F7B]">Ami</span>}
        </p>

        {user.bio && <p className="font-display-italic mt-4 whitespace-pre-wrap text-[24px] leading-[1.25] text-[#111A22]">{user.bio}</p>}

        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[16px] text-[#111A22] lg:justify-start">
          {(user.country || user.city) && (
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {[user.city, user.country].filter(Boolean).join(', ')}
            </span>
          )}
          <span className="flex items-center gap-2 text-[#7A8794]">
            <Calendar className="h-4 w-4" />
            Membre depuis {new Date(user.created_at).getFullYear()}
          </span>
        </div>

        <dl className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3 lg:justify-start">
          {stats.map((s) => {
            const inner = (
              <>
                <dd className="font-display text-[48px] leading-none text-[#111A22]">{formatNumber(s.value ?? 0)}</dd>
                <dt className="mt-1.5 text-[16px] text-[#46525E]">{s.label.toLowerCase()}</dt>
              </>
            );
            return s.onClick ? (
              <button key={s.label} type="button" onClick={s.onClick} className="text-left transition hover:opacity-70">
                {inner}
              </button>
            ) : (
              <div key={s.label}>{inner}</div>
            );
          })}
        </dl>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
          {isOwnProfile ? (
            <>
              <Button variant="outline" onClick={() => setEditOpen(true)} className="h-11 rounded-xl border-[#111A22] px-5 text-[16px]">
                <Edit2 className="mr-2 h-4 w-4" />
                Modifier le profil
              </Button>
              <Button variant="outline" size="icon" onClick={() => router.push('/settings')} aria-label="Paramètres" className="h-11 w-11 rounded-xl">
                <Settings className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <FollowButton userId={user.id} status={followStatus} onChange={onFollowChange} />
              <Button variant="outline" onClick={() => router.push(`/messages?to=${encodeURIComponent(user.username)}`)} className="h-11 rounded-xl border-[#111A22] px-5 text-[16px]">
                <MessageCircle className="mr-2 h-4 w-4" />
                Message
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Plus d'options" className="h-11 w-11 rounded-xl">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onBlock} className="text-red-600">
                    <Ban className="mr-2 h-4 w-4" />
                    Bloquer @{user.username}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {isOwnProfile && pendingRequests > 0 && (
          <Link href="/notifications" className="mt-4 inline-block rounded-full bg-[#E3EDF2] px-3 py-1 text-sm font-medium text-[#1F5F7B] hover:bg-[#D2E1E9]">
            {pendingRequests} demande{pendingRequests > 1 ? 's' : ''} d&apos;abonnement à traiter
          </Link>
        )}

        {recent.length > 0 && (
          <section className="mt-9 w-full text-left">
            <h2 className="text-[17px] font-semibold text-[#111A22]">Derniers souvenirs publics</h2>
            <ul className="mt-3 space-y-3">
              {recent.slice(0, 3).map((m) => (
                <li key={m.id}>
                  <Link href={`/memory/${m.id}`} className="group flex items-center gap-4">
                    <SmartImage src={m.cover_image} alt="" className="h-[60px] w-[80px] shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-[17px] font-medium text-[#111A22] group-hover:underline">{m.city || m.title}</span>
                      <span className="flex items-center gap-1.5 text-[15px] text-[#46525E]">
                        <Heart className="h-3.5 w-3.5 fill-[#C23B2E] text-[#C23B2E]" />
                        {formatNumber(m.likes_count ?? 0)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {isOwnProfile && <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} user={user} onUpdate={onUpdate} />}
      {list && (
        <FollowListDialog
          open
          onOpenChange={(o) => !o && setList(null)}
          username={user.username}
          kind={list}
          isOwnProfile={isOwnProfile}
          onRemovedFollower={onFollowerRemoved}
        />
      )}
    </>
  );
}
