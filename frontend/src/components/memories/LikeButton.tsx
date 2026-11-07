'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  memoryId: number;
  initialLikes: number;
  initialIsLiked?: boolean;
  onLike?: (id: number) => Promise<void>;
  onUnlike?: (id: number) => Promise<void>;
  size?: 'sm' | 'default' | 'lg';
  showCount?: boolean;
  className?: string;
}

export function LikeButton({
  memoryId,
  initialLikes,
  initialIsLiked = false,
  onLike,
  onUnlike,
  size = 'default',
  showCount = true,
  className,
}: LikeButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikesCount(initialLikes);
  }, [initialIsLiked, initialLikes]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      // Rediriger vers login ou afficher un message
      window.location.href = '/login';
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      if (isLiked) {
        await onUnlike?.(memoryId);
      } else {
        await onLike?.(memoryId);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked);
      setLikesCount(likesCount);
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-7 gap-1 px-2 text-xs',
    default: 'h-9 gap-1.5 px-3',
    lg: 'h-10 gap-2 px-4',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Button
      variant={isLiked ? 'default' : 'outline'}
      size={size}
      onClick={handleLike}
      disabled={isLoading}
      className={cn(sizeClasses[size], className)}
    >
      <Heart
        className={cn(
          iconSizes[size],
          isLiked && 'fill-current'
        )}
      />
      {showCount && likesCount > 0 && (
        <span>{likesCount}</span>
      )}
    </Button>
  );
}