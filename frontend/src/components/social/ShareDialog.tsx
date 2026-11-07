'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, Search, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { socialApi } from '@/lib/api/social';
import { messagesApi } from '@/lib/api/messages';
import { getErrorMessage } from '@/lib/api/errors';
import type { PublicUser } from '@/types/social';

interface ShareDialogProps {
  memoryId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Partager un souvenir : envoi en message privé à des amis + lien à copier. */
export function ShareDialog({ memoryId, open, onOpenChange }: ShareDialogProps) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setNote('');
    setFeedback(null);
    setQ('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = q.trim().length >= 2 ? await socialApi.searchUsers(q.trim()) : await socialApi.friends();
        if (!cancelled) setUsers(res.data ?? []);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, q ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, q]);

  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 10 ? s : [...s, id]));

  const copyLink = async () => {
    const url = `${window.location.origin}/memory/${memoryId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copiez ce lien :', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const send = async () => {
    if (!selected.length) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await messagesApi.shareMemory(memoryId, selected, note.trim() || undefined);
      const { sent, failed } = res.data;
      if (failed.length === 0) {
        setFeedback({ ok: true, text: `Souvenir envoyé à ${sent.length} personne${sent.length > 1 ? 's' : ''} ✓` });
        setSelected([]);
      } else {
        setFeedback({
          ok: sent.length > 0,
          text: `${sent.length} envoi(s) réussi(s). Échec : ${failed.map((f) => f.reason).join(' · ')}`,
        });
      }
    } catch (e) {
      setFeedback({ ok: false, text: getErrorMessage(e) });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Partager ce souvenir</DialogTitle>
          <DialogDescription>Envoyez-le en message privé à vos amis (abonnés mutuels).</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8794]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un voyageur…" className="pl-9" />
        </div>

        <div className="max-h-60 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[#1F5F7B]" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#7A8794]">
              {q.trim().length >= 2
                ? 'Aucun voyageur trouvé.'
                : "Vous n'avez pas encore d'amis. Suivez-vous mutuellement pour pouvoir partager, ou copiez le lien."}
            </p>
          ) : (
            users.map((u) => {
              const on = selected.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${on ? 'bg-[#E3EDF2]' : 'hover:bg-[#F4F5F7]'}`}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{u.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111A22]">{u.full_name}</p>
                    <p className="truncate text-xs text-[#7A8794]">@{u.username}</p>
                  </div>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${on ? 'border-[#1F5F7B] bg-[#1F5F7B] text-white' : 'border-[#B9C3CC]'}`}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Ajouter un message (facultatif)" />

        {feedback && <p className={`text-sm ${feedback.ok ? 'text-green-700' : 'text-red-600'}`}>{feedback.text}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={copyLink} className="flex-1 gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Lien copié' : 'Copier le lien'}
          </Button>
          <Button
            type="button"
            onClick={send}
            disabled={!selected.length || sending}
            className="flex-1 gap-2 bg-[#1F5F7B] text-white hover:bg-[#174B62]"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer{selected.length ? ` (${selected.length})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
