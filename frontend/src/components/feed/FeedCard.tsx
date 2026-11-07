'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Globe, Heart, Lock, Map as MapIcon, MapPin, MessageCircle, Send, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MentionText } from '@/components/ui/MentionText';
import { PhotoCarousel } from '@/components/memories/PhotoCarousel';
import { ShareDialog } from '@/components/social/ShareDialog';
import { useAuthStore } from '@/store/authStore';
import { memoriesApi, memoryImages } from '@/lib/api/memories';
import { formatNumber, timeAgo } from '@/lib/utils';
import type { Memory } from '@/types';

export type FeedMemoryType = Memory;

interface FeedCardProps {
  memory: Memory;
}

/** Publication façon Instagram : auteur, photos, actions, légende, commentaires. */
export function FeedCard({ memory }: FeedCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [liked, setLiked] = useState(!!memory.is_liked);
  const [likes, setLikes] = useState(memory.likes_count ?? 0);
  const [saved, setSaved] = useState(!!memory.is_favorited);
  const [comments, setComments] = useState(memory.comments_count ?? 0);
  const [expanded, setExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [burst, setBurst] = useState(false);

  const images = memoryImages(memory);
  const place = [memory.city, memory.country].filter(Boolean).join(', ');
  const long = (memory.description ?? '').length > 140 || (memory.description ?? '').includes('\n');

  const requireLogin = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return true;
    }
    return false;
  };

  const setLike = async (next: boolean) => {
    if (requireLogin()) return;
    const prev = { liked, likes };
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      const res = next ? await memoriesApi.like(memory.id) : await memoriesApi.unlike(memory.id);
      setLikes(res.data.likes_count);
    } catch {
      setLiked(prev.liked);
      setLikes(prev.likes);
    }
  };

  const doubleTapLike = () => {
    if (!isAuthenticated) return;
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
    if (!liked) void setLike(true);
  };

  const toggleSave = async () => {
    if (requireLogin()) return;
    const next = !saved;
    setSaved(next);
    try {
      if (next) await memoriesApi.addFavorite(memory.id);
      else await memoriesApi.removeFavorite(memory.id);
    } catch {
      setSaved(!next);
    }
  };

  const postComment = async () => {
    const content = draft.trim();
    if (!content || requireLogin()) return;
    setPosting(true);
    try {
      await memoriesApi.comment(memory.id, content);
      setDraft('');
      setComments((c) => c + 1);
    } catch {
      /* le détail reste accessible via la page du souvenir */
    } finally {
      setPosting(false);
    }
  };

  const VisIcon = memory.visibility === 'private' ? Lock : memory.visibility === 'followers' ? Users : Globe;

  return (
    <article className="overflow-hidden rounded-[20px] border border-[#E3E7EC] bg-white">
      {/* En-tête */}
      <header className="flex items-center gap-3 px-5 py-4">
        <Link href={`/profile/${memory.user?.username}`}>
          <Avatar className="h-12 w-12 ring-2 ring-[#E3EDF2]">
            <AvatarImage src={memory.user?.avatar_url} />
            <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">
              {(memory.user?.full_name || memory.user?.username || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${memory.user?.username}`} className="block truncate text-[17px] font-semibold text-[#111A22] hover:underline">
            {memory.user?.full_name || memory.user?.username}
          </Link>
          {place && (
            <p className="flex items-center gap-1 truncate text-[15px] text-[#46525E]">
              <MapPin className="h-3 w-3 shrink-0" />
              {place}
            </p>
          )}
        </div>
        {memory.first_in_country && (
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E3D3A6] bg-[#FBF6EA] px-3.5 py-1.5 text-[14px] font-medium text-[#8A6D2F]">
            <MapIcon className="h-4 w-4" aria-hidden />
            <span className="max-sm:sr-only">Nouveau pays sur sa carte</span>
          </span>
        )}
        <VisIcon className="h-4 w-4 shrink-0 text-[#7A8794]" aria-label={memory.visibility} />
      </header>

      {/* Photos */}
      <div className="relative">
        <PhotoCarousel images={images} alt={memory.title} placeholderTitle={memory.title} onDoubleClick={doubleTapLike} />
        {burst && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Heart className="h-24 w-24 animate-ping fill-white text-white drop-shadow-lg" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 px-5 pt-4 text-[#111A22]">
        <button type="button" onClick={() => setLike(!liked)} aria-label="J'aime" className="transition hover:scale-110">
          <Heart className={`h-6 w-6 ${liked ? 'fill-[#C23B2E] text-[#C23B2E]' : ''}`} />
        </button>
        <Link href={`/memory/${memory.id}#comments`} aria-label="Commenter" className="transition hover:scale-110">
          <MessageCircle className="h-6 w-6" />
        </Link>
        <button
          type="button"
          onClick={() => !requireLogin() && setShareOpen(true)}
          aria-label="Partager"
          className="transition hover:scale-110"
        >
          <Send className="h-6 w-6" />
        </button>
        <button type="button" onClick={toggleSave} aria-label="Enregistrer" className="ml-auto transition hover:scale-110">
          <Bookmark className={`h-6 w-6 ${saved ? 'fill-[#111A22]' : ''}`} />
        </button>
      </div>

      <div className="space-y-1 px-5 pb-4 pt-2 text-[16px] leading-snug">
        <p className="font-semibold text-[#111A22]">
          {formatNumber(likes)} J&apos;aime
        </p>
        <div className="text-[#111A22]">
          <Link href={`/profile/${memory.user?.username}`} className="mr-1 font-semibold hover:underline">
            {memory.user?.username}
          </Link>
          <Link href={`/memory/${memory.id}`} className="font-semibold hover:text-[#1F5F7B]">
            {memory.title}
          </Link>
          <span className="mx-1 text-[#7A8794]">—</span>
          <span className={`whitespace-pre-wrap ${expanded ? '' : 'line-clamp-2'}`}>
            <MentionText text={memory.description ?? ''} />
          </span>
          {long && !expanded && (
            <button type="button" onClick={() => setExpanded(true)} className="ml-1 text-[#7A8794] hover:underline">
              plus
            </button>
          )}
        </div>

        {memory.tags && memory.tags.length > 0 && (
          <p className="flex flex-wrap gap-x-2 text-[#1F5F7B]">
            {memory.tags.map((t) => (
              <Link key={t.id} href={`/explore?tag=${encodeURIComponent(t.slug)}`} className="hover:underline">
                #{t.name}
              </Link>
            ))}
          </p>
        )}

        {comments > 0 && (
          <Link href={`/memory/${memory.id}#comments`} className="block text-[#7A8794] hover:underline">
            Voir {comments > 1 ? `les ${formatNumber(comments)} commentaires` : 'le commentaire'}
          </Link>
        )}
        <p className="text-[11px] uppercase tracking-wide text-[#7A8794]">{timeAgo(memory.created_at)}</p>
      </div>

      {/* Commentaire rapide */}
      {isAuthenticated && (
        <div className="flex items-center gap-2 border-t border-[#E3E7EC] px-4 py-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && postComment()}
            maxLength={1000}
            placeholder="Ajouter un commentaire…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#7A8794]"
          />
          <button
            type="button"
            onClick={postComment}
            disabled={!draft.trim() || posting}
            className="text-sm font-semibold text-[#1F5F7B] disabled:opacity-40"
          >
            Publier
          </button>
        </div>
      )}

      <ShareDialog memoryId={memory.id} open={shareOpen} onOpenChange={setShareOpen} />
    </article>
  );
}
