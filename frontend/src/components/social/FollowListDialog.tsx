'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { socialApi } from '@/lib/api/social';
import { getErrorMessage } from '@/lib/api/errors';
import type { PublicUser } from '@/types/social';

interface FollowListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  kind: 'followers' | 'following';
  isOwnProfile: boolean;
  onRemovedFollower?: () => void;
}

export function FollowListDialog({ open, onOpenChange, username, kind, isOwnProfile, onRemovedFollower }: FollowListDialogProps) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (kind === 'followers' ? socialApi.followers(username) : socialApi.following(username))
      .then((res) => !cancelled && setUsers(res.data ?? []))
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, username, kind]);

  const removeFollower = async (u: PublicUser) => {
    if (!window.confirm(`Retirer @${u.username} de vos abonnés ?`)) return;
    try {
      await socialApi.removeFollower(u.id);
      setUsers((list) => list.filter((x) => x.id !== u.id));
      onRemovedFollower?.();
    } catch (e) {
      window.alert(getErrorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{kind === 'followers' ? 'Abonnés' : 'Abonnements'}</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#1F5F7B]" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-[#7A8794]">{error}</p>
          ) : users.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#7A8794]">Personne pour l&apos;instant.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#F4F5F7]">
                <Link href={`/profile/${u.username}`} onClick={() => onOpenChange(false)} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{u.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111A22]">{u.username}</p>
                    <p className="truncate text-xs text-[#7A8794]">{u.full_name}</p>
                  </div>
                </Link>
                {isOwnProfile && kind === 'followers' && (
                  <Button type="button" size="sm" variant="outline" onClick={() => removeFollower(u)}>
                    Retirer
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
