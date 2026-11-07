/* eslint-disable @next/next/no-img-element */
'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, MapPin, Search, Send, SquarePen, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { messagesApi } from '@/lib/api/messages';
import { profileApi } from '@/lib/api/profile';
import { socialApi } from '@/lib/api/social';
import { getErrorMessage } from '@/lib/api/errors';
import { timeAgo } from '@/lib/utils';
import type { ChatMessage, Conversation, PublicUser } from '@/types/social';

type Other = Conversation['user'];

function MessagesContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();
  const activeId = params.get('c') ? Number(params.get('c')) : null;
  const to = params.get('to');

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  const loadList = useCallback(async () => {
    try {
      const res = await messagesApi.conversations();
      setConvs(res.data ?? []);
    } catch {
      /* conserve la liste précédente */
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadList();
    const id = setInterval(() => document.visibilityState === 'visible' && void loadList(), 10000);
    return () => clearInterval(id);
  }, [isAuthenticated, loadList]);

  // /messages?to=pseudo : ouvre (ou crée) la conversation avec ce voyageur.
  useEffect(() => {
    if (!to || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await profileApi.getByUsername(to);
        const c = await messagesApi.open(p.data.user.id);
        if (!cancelled) router.replace(`/messages?c=${c.data.id}`);
      } catch (e) {
        if (!cancelled) {
          setOpenError(getErrorMessage(e));
          router.replace('/messages');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [to, isAuthenticated, router]);

  const startWith = async (u: PublicUser) => {
    try {
      const c = await messagesApi.open(u.id);
      setNewOpen(false);
      router.push(`/messages?c=${c.data.id}`);
    } catch (e) {
      setOpenError(getErrorMessage(e));
      setNewOpen(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <div className="bg-[#F4F5F7]">
      <div className="mx-auto flex h-[calc(100vh-4rem-4rem)] max-w-5xl overflow-hidden border-x border-[#E3E7EC] bg-white md:h-[calc(100vh-4rem)]">
        {/* Liste */}
        <aside className={`${activeId ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-[#E3E7EC] md:w-80`}>
          <div className="flex items-center justify-between border-b border-[#E3E7EC] px-4 py-3">
            <h1 className="text-lg font-bold text-[#111A22]">Messages</h1>
            <Button variant="ghost" size="icon" onClick={() => setNewOpen(true)} aria-label="Nouveau message">
              <SquarePen className="h-5 w-5" />
            </Button>
          </div>
          {openError && <p className="m-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{openError}</p>}
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-[#1F5F7B]" />
              </div>
            ) : convs.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#7A8794]">
                <Send className="mx-auto mb-2 h-8 w-8 text-[#B9C3CC]" />
                Aucune conversation. Écrivez à un voyageur ou partagez-lui un souvenir.
              </div>
            ) : (
              convs.map((c) => (
                <Link
                  key={c.id}
                  href={`/messages?c=${c.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-[#F4F5F7] ${c.id === activeId ? 'bg-[#F4F5F7]' : ''}`}
                >
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={c.user.avatar_url} />
                    <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{c.user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${c.unread_count ? 'font-bold' : 'font-medium'} text-[#111A22]`}>{c.user.full_name}</p>
                    <p className={`truncate text-xs ${c.unread_count ? 'font-semibold text-[#111A22]' : 'text-[#7A8794]'}`}>
                      {c.last_message.is_mine ? 'Vous : ' : ''}
                      {c.last_message.preview} · {timeAgo(c.last_message_at)}
                    </p>
                  </div>
                  {c.unread_count > 0 && <span className="h-2.5 w-2.5 rounded-full bg-[#1F5F7B]" aria-label={`${c.unread_count} non lus`} />}
                </Link>
              ))
            )}
          </div>
        </aside>

        {/* Fil */}
        <section className={`${activeId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
          {activeId ? (
            <Thread key={activeId} conversationId={activeId} onBack={() => router.push('/messages')} onActivity={loadList} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[#7A8794]">
              <Send className="h-12 w-12 text-[#B9C3CC]" />
              <p>Sélectionnez une conversation</p>
            </div>
          )}
        </section>
      </div>

      <NewMessageDialog open={newOpen} onOpenChange={setNewOpen} onPick={startWith} />
    </div>
  );
}

function Thread({ conversationId, onBack, onActivity }: { conversationId: number; onBack: () => void; onActivity: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [other, setOther] = useState<Other | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);

  const refresh = useCallback(
    async (scroll = false) => {
      try {
        const res = await messagesApi.messages(conversationId);
        setMessages(res.data);
        setOther(res.user);
        setHasMore(res.has_more);
        setError(null);
        const newest = res.data[res.data.length - 1]?.id ?? 0;
        const hasUnread = res.data.some((m) => !m.is_mine && !m.read_at);
        if (hasUnread) {
          messagesApi.markRead(conversationId).then(onActivity).catch(() => undefined);
        }
        if (scroll || newest !== lastId.current) {
          lastId.current = newest;
          setTimeout(() => bottom.current?.scrollIntoView({ behavior: scroll ? 'auto' : 'smooth' }), 30);
        }
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [conversationId, onActivity],
  );

  useEffect(() => {
    void refresh(true);
    const id = setInterval(() => document.visibilityState === 'visible' && void refresh(), 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const older = async () => {
    const first = messages[0]?.id;
    if (!first) return;
    const res = await messagesApi.messages(conversationId, first);
    setMessages((m) => [...res.data, ...m]);
    setHasMore(res.has_more);
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await messagesApi.send(conversationId, { body });
      setMessages((m) => [...m, res.data]);
      lastId.current = res.data.id;
      setDraft('');
      setError(null);
      setTimeout(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), 30);
      onActivity();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const remove = async (m: ChatMessage) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      await messagesApi.remove(conversationId, m.id);
      setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, deleted: true, body: null, memory: null } : x)));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <>
      <header className="flex items-center gap-3 border-b border-[#E3E7EC] px-4 py-3">
        <button type="button" onClick={onBack} className="md:hidden" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {other && (
          <Link href={`/profile/${other.username}`} className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={other.avatar_url} />
              <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{other.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-[#111A22]">{other.full_name}</p>
              <p className="text-xs text-[#7A8794]">@{other.username}</p>
            </div>
          </Link>
        )}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-[#FAFAF6] px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-[#1F5F7B]" />
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={older}>
                  Messages précédents
                </Button>
              </div>
            )}
            {messages.length === 0 && <p className="py-10 text-center text-sm text-[#7A8794]">Dites bonjour 👋</p>}
            {messages.map((m) => (
              <div key={m.id} className={`group flex ${m.is_mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[78%] items-end gap-1 ${m.is_mine ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      m.deleted
                        ? 'border border-dashed border-[#B9C3CC] italic text-[#7A8794]'
                        : m.is_mine
                          ? 'bg-[#1F5F7B] text-white'
                          : 'border border-[#E3E7EC] bg-white text-[#111A22]'
                    }`}
                  >
                    {m.deleted ? (
                      'Message supprimé'
                    ) : (
                      <>
                        {m.memory && <SharedMemoryCard memory={m.memory} mine={m.is_mine} />}
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                        <p className={`mt-1 text-[10px] ${m.is_mine ? 'text-white/70' : 'text-[#7A8794]'}`}>
                          {timeAgo(m.created_at)}
                          {m.is_mine && m.read_at ? ' · Vu' : ''}
                        </p>
                      </>
                    )}
                  </div>
                  {m.is_mine && !m.deleted && (
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      aria-label="Supprimer le message"
                      className="hidden text-[#7A8794] hover:text-red-600 group-hover:block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottom} />
          </>
        )}
      </div>

      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex items-center gap-2 border-t border-[#E3E7EC] p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void send())}
          maxLength={2000}
          placeholder="Écrire un message…"
          className="flex-1"
        />
        <Button onClick={send} disabled={!draft.trim() || sending} className="bg-[#1F5F7B] text-white hover:bg-[#174B62]" aria-label="Envoyer">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}

function SharedMemoryCard({ memory, mine }: { memory: NonNullable<ChatMessage['memory']>; mine: boolean }) {
  if (memory.unavailable || !memory.id) {
    return <p className="mb-1 rounded-lg bg-black/10 p-2 text-xs italic">Souvenir indisponible (privé ou supprimé)</p>;
  }
  return (
    <Link href={`/memory/${memory.id}`} className={`mb-1 block w-56 overflow-hidden rounded-xl ${mine ? 'bg-white/15' : 'bg-[#F4F5F7]'}`}>
      {memory.cover_image ? (
        <img src={memory.cover_image} alt={memory.title} className="h-32 w-full object-cover" />
      ) : (
        <div className="flex h-24 items-center justify-center bg-[#E3EDF2]">
          <MapPin className="h-6 w-6 text-[#1F5F7B]" />
        </div>
      )}
      <div className="p-2">
        <p className="line-clamp-1 text-sm font-semibold">{memory.title}</p>
        <p className="line-clamp-1 text-xs opacity-80">{[memory.city, memory.country].filter(Boolean).join(', ')}</p>
      </div>
    </Link>
  );
}

function NewMessageDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (u: PublicUser) => void }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<PublicUser[]>([]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        const r = q.trim().length >= 2 ? await socialApi.searchUsers(q.trim()) : await socialApi.friends();
        setUsers(r.data ?? []);
      } catch {
        setUsers([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [open, q]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouveau message</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8794]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un voyageur…" className="pl-9" />
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {users.length === 0 && <p className="py-6 text-center text-sm text-[#7A8794]">Tapez au moins 2 lettres pour chercher un voyageur.</p>}
          {users.map((u) => (
            <button key={u.id} type="button" onClick={() => onPick(u)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[#F4F5F7]">
              <Avatar className="h-9 w-9">
                <AvatarImage src={u.avatar_url} />
                <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{u.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-[#111A22]">{u.full_name}</p>
                <p className="text-xs text-[#7A8794]">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesContent />
    </Suspense>
  );
}
