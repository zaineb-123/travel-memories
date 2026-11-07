'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { socialApi } from '@/lib/api/social';
import { getErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/authStore';
import type { FollowStatus } from '@/types/social';

interface FollowButtonProps {
  userId: number;
  status: FollowStatus;
  onChange: (next: FollowStatus, previous: FollowStatus) => void;
  size?: 'default' | 'sm';
}

/** Suivre / Demandé / Abonné — gère les comptes privés (demande à accepter) comme Instagram. */
export function FollowButton({ userId, status, onChange, size = 'default' }: FollowButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [busy, setBusy] = useState(false);

  const click = async () => {
    if (!isAuthenticated) return router.push('/login');
    if (status === 'following' && !window.confirm('Ne plus suivre ce voyageur ?')) return;
    setBusy(true);
    try {
      if (status === 'none') {
        const res = await socialApi.follow(userId);
        onChange(res.data.status, status);
      } else {
        await socialApi.unfollow(userId);
        onChange('none', status);
      }
    } catch (e) {
      window.alert(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const content =
    status === 'following' ? (
      <>
        <Check className="mr-1 h-4 w-4" />
        Abonné
      </>
    ) : status === 'requested' ? (
      <>
        <Clock className="mr-1 h-4 w-4" />
        Demandé
      </>
    ) : (
      <>
        <UserPlus className="mr-1 h-4 w-4" />
        Suivre
      </>
    );

  return (
    <Button
      type="button"
      size={size}
      variant={status === 'none' ? 'default' : 'outline'}
      onClick={click}
      disabled={busy}
      className={status === 'none' ? 'bg-[#1F5F7B] text-white hover:bg-[#174B62]' : ''}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : content}
    </Button>
  );
}
