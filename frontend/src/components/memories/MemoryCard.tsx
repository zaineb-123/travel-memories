/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { Copy, Heart, Lock, MapPin, MessageCircle, Users } from 'lucide-react';
import { Memory } from '@/types';
import { memoryImages } from '@/lib/api/memories';
import { formatNumber } from '@/lib/utils';

interface MemoryCardProps {
  memory: Memory;
  /** Conservé pour compatibilité : le like se fait depuis la page du souvenir ou le fil. */
  onLike?: (id: number) => void;
}

/** Vignette carrée façon grille Instagram (profil, explorer). */
export function MemoryCard({ memory }: MemoryCardProps) {
  const images = memoryImages(memory);
  const cover = images[0];
  const place = [memory.city, memory.country].filter(Boolean).join(', ');

  return (
    <Link
      href={`/memory/${memory.id}`}
      className="group relative block aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-[#E3EDF2] to-[#B9C3CC]"
    >
      {cover ? (
        <img src={cover} alt={memory.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
          <MapPin className="h-8 w-8 text-[#1F5F7B]/70" />
          <p className="line-clamp-3 text-sm font-semibold text-[#46525E]">{memory.title}</p>
        </div>
      )}

      <div className="absolute right-2 top-2 flex gap-1 text-white drop-shadow">
        {images.length > 1 && <Copy className="h-4 w-4" aria-label="Plusieurs photos" />}
        {memory.visibility === 'private' && <Lock className="h-4 w-4" aria-label="Privé" />}
        {memory.visibility === 'followers' && <Users className="h-4 w-4" aria-label="Abonnés uniquement" />}
      </div>

      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <p className="line-clamp-1 text-sm font-semibold">{memory.title}</p>
        {place && <p className="line-clamp-1 text-xs text-white/80">{place}</p>}
        <div className="mt-1 flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 fill-white" />
            {formatNumber(memory.likes_count ?? 0)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5 fill-white" />
            {formatNumber(memory.comments_count ?? 0)}
          </span>
        </div>
      </div>
    </Link>
  );
}
