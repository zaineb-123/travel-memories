'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Memory } from '@/types';
import { Heart, MessageCircle, Eye, MapPin } from 'lucide-react';
import { formatNumber, timeAgo } from '@/lib/utils';

interface MemoryPopupProps {
  memory: Memory;
  onClose?: () => void;
}

export function MemoryPopup({ memory, onClose }: MemoryPopupProps) {
  return (
    <div className="w-64 overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
      {/* Image */}
      {memory.cover_image ? (
        <div className="relative h-32 w-full">
          <Image
            src={memory.cover_image}
            alt={memory.title}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-linear-to-r from-blue-500 to-purple-600">
          <MapPin className="h-8 w-8 text-white" />
        </div>
      )}

      {/* Contenu */}
      <div className="p-3">
        <h4 className="font-semibold line-clamp-1">{memory.title}</h4>
        
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">
            {memory.country}{memory.city ? `, ${memory.city}` : ''}
          </span>
        </div>

        <p className="mt-2 text-xs text-gray-600 line-clamp-2 dark:text-gray-300">
          {memory.description}
        </p>

        {/* Statistiques */}
        <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>{formatNumber(memory.likes_count)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{formatNumber(memory.comments_count)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{formatNumber(memory.views_count)}</span>
            </div>
          </div>
          <span>{timeAgo(memory.created_at)}</span>
        </div>

        {/* Lien */}
        <Link
          href={`/memory/${memory.id}`}
          className="mt-3 block text-center text-sm text-blue-500 hover:underline"
          onClick={onClose}
        >
          Voir les détails →
        </Link>
      </div>
    </div>
  );
}