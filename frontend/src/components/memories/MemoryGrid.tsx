'use client';

import { Memory } from '@/types';
import { MemoryCard } from './MemoryCard';
import { Loader2 } from 'lucide-react';

interface MemoryGridProps {
  memories: Memory[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onLike?: (id: number) => void;
}

export function MemoryGrid({ 
  memories, 
  isLoading, 
  hasMore, 
  onLoadMore, 
  onLike 
}: MemoryGridProps) {
  if (isLoading && memories.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Aucun souvenir à afficher</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="memories-grid">
        {memories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} onLike={onLike} />
        ))}
      </div>
      
      {hasMore && (
        <div className="flex justify-center py-4">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          ) : (
            <button
              onClick={onLoadMore}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Charger plus
            </button>
          )}
        </div>
      )}
    </div>
  );
}