'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Memory } from '@/types';
import { FeedCard } from './FeedCard';
import { Loader2, Inbox } from 'lucide-react';

interface FeedListProps {
  memories: Memory[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onLike?: (id: number) => Promise<void>;
  onUnlike?: (id: number) => Promise<void>;
  emptyMessage?: string;
}

export function FeedList({
  memories,
  isLoading,
  hasMore,
  onLoadMore,
  onLike,
  onUnlike,
  emptyMessage = "Aucun contenu à afficher",
}: FeedListProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleObserver, {
      rootMargin: '0px 0px 200px 0px',
      threshold: 0.1,
    });

    if (lastElementRef.current) {
      observerRef.current.observe(lastElementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, memories]);

  if (isLoading && memories.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Inbox className="h-12 w-12 mb-3" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {memories.map((memory, index) => (
        <div
          key={memory.id}
          ref={index === memories.length - 1 ? lastElementRef : null}
        >
          <FeedCard memory={memory} />
        </div>
      ))}
      
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      )}
    </div>
  );
}