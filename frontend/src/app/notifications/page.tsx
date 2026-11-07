'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AtSign, Bell, CheckCheck, Heart, Loader2, MessageCircle, Send, UserCheck, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api/client';
import { socialApi } from '@/lib/api/social';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { timeAgo } from '@/lib/utils';
import type { PublicUser } from '@/types/social';

type NType = 'like' | 'comment' | 'follow' | 'follow_request' | 'follow_accepted' | 'mention' | 'message' | string;

interface Notification {
  id: number;
  from_user_id: number;
  type: NType;
  reference_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  from_user?: { username: string; avatar_url: string; full_name: string };
}

const ICONS: Record<string, { icon: typeof Bell; color: string }> = {
  like: { icon: Heart, color: 'text-red-500' },
  comment: { icon: MessageCircle, color: 'text-blue-500' },
  follow: { icon: UserPlus, color: 'text-green-600' },
  follow_request: { icon: UserPlus, color: 'text-[#1F5F7B]' },
  follow_accepted: { icon: UserCheck, color: 'text-green-600' },
  mention: { icon: AtSign, color: 'text-purple-500' },
  message: { icon: Send, color: 'text-[#1F5F7B]' },
};

function linkFor(n: Notification): string {
  switch (n.type) {
    case 'like':
    case 'mention':
      return `/memory/${n.reference_id}`;
    case 'comment':
      return `/memory/${n.reference_id}#comments`;
    case 'message':
      return `/messages?c=${n.reference_id}`;
    default:
      return `/profile/${n.from_user?.username ?? ''}`;
  }
}

export default function NotificationsPage() {
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [requests, setRequests] = useState<PublicUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [n, r] = await Promise.all([
        apiClient.get<{ data: Notification[] }>('/notifications'),
        socialApi.requests().catch(() => ({ data: [] as PublicUser[] })),
      ]);
      setNotifications(n.data ?? []);
      setRequests(r.data ?? []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  const markAsRead = async (id: number) => {
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    apiClient.put(`/notifications/${id}/read`).catch(() => undefined);
  };

  const markAll = async () => {
    setNotifications((p) => p.map((n) => ({ ...n, is_read: true })));
    apiClient.put('/notifications/read-all').catch(() => undefined);
  };

  const answer = async (u: PublicUser, accept: boolean) => {
    try {
      if (accept) await socialApi.acceptRequest(u.id);
      else await socialApi.declineRequest(u.id);
      setRequests((r) => r.filter((x) => x.id !== u.id));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const shown = filter === 'all' ? notifications : notifications.filter((n) => !n.is_read);

  if (!isAuthenticated) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Card className="p-8 text-center">
          <Bell className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold">Connectez-vous</h2>
          <p className="mt-2 text-gray-500">Pour voir vos notifications</p>
          <Link href="/login"><Button className="mt-4">Se connecter</Button></Link>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1F5F7B]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-[#111A22]" />
          <h1 className="text-2xl font-bold text-[#111A22]">Notifications</h1>
          {unreadCount > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{unreadCount}</span>}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAll}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Demandes d'abonnement (comptes privés) */}
      {requests.length > 0 && (
        <section className="mb-6 rounded-xl border border-[#E3E7EC] bg-white p-4">
          <h2 className="mb-3 font-semibold text-[#111A22]">Demandes d&apos;abonnement ({requests.length})</h2>
          <ul className="space-y-3">
            {requests.map((u) => (
              <li key={u.id} className="flex items-center gap-3">
                <Link href={`/profile/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{u.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{u.username}</p>
                    <p className="truncate text-xs text-[#7A8794]">{u.full_name}</p>
                  </div>
                </Link>
                <Button size="sm" onClick={() => answer(u, true)} className="bg-[#1F5F7B] text-white hover:bg-[#174B62]">
                  Accepter
                </Button>
                <Button size="sm" variant="outline" onClick={() => answer(u, false)}>
                  Refuser
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-4 flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${filter === f ? 'bg-[#1F5F7B] text-white' : 'bg-white text-[#46525E]'}`}
          >
            {f === 'all' ? 'Toutes' : `Non lues${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {shown.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">Aucune notification</p>
          </Card>
        ) : (
          shown.map((n) => {
            const meta = ICONS[n.type] ?? { icon: Bell, color: 'text-gray-500' };
            const Icon = meta.icon;
            return (
              <Link
                key={n.id}
                href={linkFor(n)}
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={`flex items-center gap-3 rounded-xl border p-3 transition hover:bg-[#F4F5F7] ${n.is_read ? 'border-[#E3E7EC] bg-white' : 'border-[#B9C3CC] bg-[#F4F8FA]'}`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={n.from_user?.avatar_url} />
                  <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{(n.from_user?.username ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#111A22]">{n.message}</p>
                  <p className="text-xs text-[#7A8794]">{timeAgo(n.created_at)}</p>
                </div>
                <Icon className={`h-4 w-4 shrink-0 ${meta.color}`} />
                {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#1F5F7B]" />}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
