/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Loader2, MapPin, Trash2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { storiesApi } from '@/lib/api/stories';
import { timeAgo } from '@/lib/utils';
import type { PublicUser, StoryGroup } from '@/types/social';

const DURATION_MS = 5000;

interface StoryViewerProps {
  groups: StoryGroup[];
  startGroup: number;
  currentUserId: number;
  onClose: () => void;
}

/** Visionneuse plein écran : barres de progression, appui gauche/droite, vues et suppression pour l'auteur. */
export function StoryViewer({ groups: initial, startGroup, currentUserId, onClose }: StoryViewerProps) {
  const [groups, setGroups] = useState(initial);
  const [gi, setGi] = useState(startGroup);
  const [si, setSi] = useState(() => {
    // Commence à la première story non vue du groupe (comme Instagram).
    const g = initial[startGroup];
    const firstUnseen = g.stories.findIndex((s) => !s.seen && s.user_id !== currentUserId);
    return firstUnseen >= 0 ? firstUnseen : 0;
  });
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewers, setViewers] = useState<(PublicUser & { viewed_at: string })[] | null>(null);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const seenSent = useRef<Set<number>>(new Set());

  const group = groups[gi];
  const story = group?.stories[si];
  const isMine = story?.user_id === currentUserId;

  const next = useCallback(() => {
    setViewers(null);
    setProgress(0);
    setImgReady(false);
    const g = groups[gi];
    if (si < g.stories.length - 1) setSi(si + 1);
    else if (gi < groups.length - 1) {
      setGi(gi + 1);
      setSi(0);
    } else onClose();
  }, [groups, gi, si, onClose]);

  const prev = useCallback(() => {
    setViewers(null);
    setProgress(0);
    setImgReady(false);
    if (si > 0) setSi(si - 1);
    else if (gi > 0) {
      setGi(gi - 1);
      setSi(groups[gi - 1].stories.length - 1);
    }
  }, [groups, gi, si]);

  // Marque comme vue (une seule fois par story, jamais pour ses propres stories).
  useEffect(() => {
    if (!story || isMine || seenSent.current.has(story.id)) return;
    seenSent.current.add(story.id);
    storiesApi.markViewed(story.id).catch(() => undefined);
  }, [story, isMine]);

  // Minuteur de progression (en pause tant que l'image charge ou que la liste des vues est ouverte).
  useEffect(() => {
    if (!story || paused || !imgReady || viewers !== null) return;
    const started = Date.now() - (progress / 100) * DURATION_MS;
    const id = setInterval(() => {
      const p = ((Date.now() - started) / DURATION_MS) * 100;
      if (p >= 100) {
        clearInterval(id);
        next();
      } else setProgress(p);
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, paused, imgReady, viewers]);

  // Clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  // Bloque le défilement de la page derrière la visionneuse.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const showViewers = async () => {
    if (!story) return;
    setViewersLoading(true);
    setViewers([]);
    try {
      const res = await storiesApi.viewers(story.id);
      setViewers(res.data ?? []);
    } catch {
      setViewers([]);
    } finally {
      setViewersLoading(false);
    }
  };

  const remove = async () => {
    if (!story || !window.confirm('Supprimer cette story ?')) return;
    try {
      await storiesApi.remove(story.id);
    } catch {
      return;
    }
    const remaining = group.stories.filter((s) => s.id !== story.id);
    if (remaining.length) {
      setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, stories: remaining } : g)));
      setSi(Math.min(si, remaining.length - 1));
      setProgress(0);
      setImgReady(false);
    } else {
      onClose();
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95" role="dialog" aria-modal="true">
      <div className="relative h-full w-full max-w-[440px] bg-black sm:h-[92vh] sm:overflow-hidden sm:rounded-xl">
        {/* Barres de progression */}
        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 p-3">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded bg-white/35">
              <div className="h-full bg-white" style={{ width: i < si ? '100%' : i === si ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* En-tête */}
        <div className="absolute left-0 right-0 top-4 z-20 flex items-center gap-3 px-3 pt-3">
          <Link href={`/profile/${group.user.username}`} onClick={onClose} className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={group.user.avatar_url} />
              <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{group.user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold text-white">{group.user.username}</span>
            <span className="text-xs text-white/70">{timeAgo(story.created_at)}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {isMine && (
              <button type="button" onClick={remove} aria-label="Supprimer la story" className="rounded-full bg-black/40 p-2 text-white">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full bg-black/40 p-2 text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Image + zones de navigation */}
        <img
          key={story.id}
          src={story.image_url}
          alt={story.caption ?? `Story de ${group.user.username}`}
          className="h-full w-full object-contain"
          onLoad={() => setImgReady(true)}
          onError={() => setImgReady(true)}
        />
        {!imgReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          </div>
        )}
        <button type="button" aria-label="Précédent" onClick={prev} className="absolute bottom-24 left-0 top-20 z-10 w-1/3" />
        <button
          type="button"
          aria-label="Suivant"
          onClick={next}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          className="absolute bottom-24 right-0 top-20 z-10 w-2/3"
        />

        {/* Légende / lieu / vues */}
        <div className="absolute bottom-0 left-0 right-0 z-20 space-y-2 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-white">
          {(story.location_name || story.country) && (
            <p className="flex items-center gap-1 text-xs text-white/80">
              <MapPin className="h-3 w-3" />
              {story.location_name || story.country}
            </p>
          )}
          {story.caption && <p className="text-sm">{story.caption}</p>}
          {isMine && (
            <button type="button" onClick={showViewers} className="flex items-center gap-1 text-xs text-white/90">
              <Eye className="h-4 w-4" />
              {story.views_count ?? 0} vue{(story.views_count ?? 0) > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Liste des vues (auteur uniquement) */}
        {viewers !== null && (
          <div className="absolute inset-x-0 bottom-0 z-30 max-h-[60%] overflow-y-auto rounded-t-2xl bg-white p-4 text-[#111A22]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Vues</h3>
              <button type="button" onClick={() => setViewers(null)} aria-label="Fermer la liste">
                <X className="h-5 w-5" />
              </button>
            </div>
            {viewersLoading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#1F5F7B]" />
            ) : viewers.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#7A8794]">Personne n&apos;a encore vu cette story.</p>
            ) : (
              <ul className="space-y-2">
                {viewers.map((v) => (
                  <li key={v.id}>
                    <Link href={`/profile/${v.username}`} onClick={onClose} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={v.avatar_url} />
                        <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{v.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{v.full_name}</span>
                      <span className="text-xs text-[#7A8794]">@{v.username}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
