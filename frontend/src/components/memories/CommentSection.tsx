'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MentionText } from '@/components/ui/MentionText';
import { timeAgo } from '@/lib/utils';

interface Comment {
  id: number;
  user_id: number;
  content: string;
  likes_count: number;
  created_at: string;
  is_liked?: boolean;
  user?: { username: string; avatar_url: string; full_name: string };
}

export function CommentSection({ memoryId, onCountChange }: { memoryId: number; onCountChange?: (n: number) => void }) {
  const { user, isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try {
      // apiClient ajoute le jeton : on voit aussi l'état « aimé » et on respecte les blocages.
      const res = await apiClient.get<{ data: Comment[] }>(`/memories/${memoryId}/comments`);
      setComments(res.data ?? []);
      onCountChange?.((res.data ?? []).length);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [memoryId, onCountChange]);

  useEffect(() => {
    setIsLoading(true);
    void loadComments();
  }, [loadComments, isAuthenticated]);

  const handleSubmit = async () => {
    const content = newComment.trim();
    if (!content) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/memories/${memoryId}/comments`, { content });
      setNewComment('');
      await loadComments();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (c: Comment) => {
    if (!isAuthenticated) return;
    setComments((list) =>
      list.map((x) => (x.id === c.id ? { ...x, is_liked: !c.is_liked, likes_count: x.likes_count + (c.is_liked ? -1 : 1) } : x)),
    );
    try {
      if (c.is_liked) await apiClient.delete(`/comments/${c.id}/like`);
      else await apiClient.post(`/comments/${c.id}/like`);
    } catch {
      await loadComments();
    }
  };

  const handleDelete = async (c: Comment) => {
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    try {
      await apiClient.delete(`/comments/${c.id}`);
      await loadComments();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div id="comments" className="scroll-mt-20 space-y-5">
      <div className="flex items-center gap-2 text-lg font-semibold text-[#111A22]">
        <MessageCircle className="h-5 w-5" />
        <span>Commentaires ({comments.length})</span>
      </div>

      {isAuthenticated ? (
        <div className="space-y-3">
          <Textarea
            placeholder="Partagez votre avis… (@pseudo pour identifier quelqu'un)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <Button onClick={handleSubmit} disabled={isSubmitting || !newComment.trim()} className="bg-[#1F5F7B] text-white hover:bg-[#174B62]">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publier'}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E3E7EC] bg-white py-4 text-center text-gray-500">
          <p>Connectez-vous pour laisser un commentaire</p>
          <Button variant="outline" className="mt-2" asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500">Aucun commentaire pour le moment</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3 rounded-xl border border-[#E3E7EC] bg-white p-4">
              <Link href={`/profile/${c.user?.username}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={c.user?.avatar_url} />
                  <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{c.user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/profile/${c.user?.username}`} className="font-medium text-[#111A22] hover:underline">
                    {c.user?.full_name}
                  </Link>
                  <span className="text-xs text-gray-500">@{c.user?.username}</span>
                  <span className="text-xs text-gray-400">· {timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                  <MentionText text={c.content} />
                </p>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <button type="button" onClick={() => handleLike(c)} className="flex items-center gap-1 hover:text-red-500">
                    <Heart className={`h-3.5 w-3.5 ${c.is_liked ? 'fill-red-500 text-red-500' : ''}`} />
                    {c.likes_count}
                  </button>
                  {user && (user.id === c.user_id || user.role === 'admin') && (
                    <button type="button" onClick={() => handleDelete(c)} className="flex items-center gap-1 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
