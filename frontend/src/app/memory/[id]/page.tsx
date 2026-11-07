'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bookmark, Calendar, Eye, Heart, Loader2, Lock, MapPin, Send, Trash2, Users, Globe, Lock as LockIcon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { memoriesApi, memoryImages } from '@/lib/api/memories';
import { uploadApi } from '@/lib/api/upload';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MentionText } from '@/components/ui/MentionText';
import { PhotoCarousel } from '@/components/memories/PhotoCarousel';
import { PhotoPicker } from '@/components/memories/PhotoPicker';
import { CommentSection } from '@/components/memories/CommentSection';
import { ShareDialog } from '@/components/social/ShareDialog';
import { FollowButton } from '@/components/social/FollowButton';
import { formatNumber } from '@/lib/utils';
import type { Memory } from '@/types';
import type { FollowStatus } from '@/types/social';
import { profileApi } from '@/lib/api/profile';

export default function MemoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memoryId = parseInt(params.id as string, 10);
  const { user, isAuthenticated } = useAuthStore();

  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [follow, setFollow] = useState<FollowStatus>('none');
  const [addFiles, setAddFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await memoriesApi.getById(memoryId);
      setMemory(res.data);
      setLiked(!!res.data.is_liked);
      setLikes(res.data.likes_count ?? 0);
      setSaved(!!res.data.is_favorited);
      setError(null);
    } catch {
      setError('Ce souvenir est introuvable, privé ou a été supprimé.');
    } finally {
      setLoading(false);
    }
  }, [memoryId]);

  useEffect(() => {
    if (Number.isFinite(memoryId)) void load();
  }, [memoryId, load, isAuthenticated]);

  const isOwner = !!user && !!memory && memory.user_id === user.id;

  useEffect(() => {
    if (!memory || !isAuthenticated || isOwner || !memory.user?.username) return;
    profileApi.getByUsername(memory.user.username).then((r) => setFollow(r.data.follow_status ?? 'none')).catch(() => undefined);
  }, [memory, isAuthenticated, isOwner]);

  const requireLogin = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return true;
    }
    return false;
  };

  const toggleLike = async () => {
    if (requireLogin()) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      const res = next ? await memoriesApi.like(memoryId) : await memoriesApi.unlike(memoryId);
      setLikes(res.data.likes_count);
    } catch {
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
    }
  };

  const toggleSave = async () => {
    if (requireLogin()) return;
    const next = !saved;
    setSaved(next);
    try {
      if (next) await memoriesApi.addFavorite(memoryId);
      else await memoriesApi.removeFavorite(memoryId);
    } catch {
      setSaved(!next);
    }
  };

  const remove = async () => {
    if (!window.confirm('Supprimer définitivement ce souvenir et ses photos ?')) return;
    try {
      await memoriesApi.delete(memoryId);
      router.push(`/profile/${user?.username}`);
    } catch (e) {
      window.alert(getErrorMessage(e));
    }
  };

  const uploadMore = async () => {
    if (!addFiles.length) return;
    setUploading(true);
    try {
      await uploadApi.uploadMultiplePhotos(memoryId, addFiles);
      setAddFiles([]);
      setShowAdd(false);
      await load();
    } catch (e) {
      window.alert(getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: number) => {
    if (!window.confirm('Supprimer cette photo ?')) return;
    try {
      await memoriesApi.deletePhoto(memoryId, photoId);
      await load();
    } catch (e) {
      window.alert(getErrorMessage(e));
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1F5F7B]" />
      </div>
    );
  }

  if (error || !memory) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-[#B9C3CC]" />
        <p className="text-[#111A22]">{error ?? 'Souvenir introuvable'}</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/feed')}>
          Retour au fil
        </Button>
      </div>
    );
  }

  const images = memoryImages(memory);
  const place = memory.location_name || [memory.city, memory.country].filter(Boolean).join(', ');
  const VisIcon = memory.visibility === 'private' ? LockIcon : memory.visibility === 'followers' ? Users : Globe;
  const visLabel = memory.visibility === 'private' ? 'Privé' : memory.visibility === 'followers' ? 'Abonnés uniquement' : 'Public';

  return (
    <div className="bg-[#F4F5F7]">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <article className="overflow-hidden rounded-xl border border-[#E3E7EC] bg-white shadow-sm">
          <header className="flex items-center gap-3 px-5 py-4">
            <Link href={`/profile/${memory.user?.username}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={memory.user?.avatar_url} />
                <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{memory.user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium text-[#111A22]">{memory.user?.full_name}</p>
                <p className="truncate text-sm text-[#7A8794]">@{memory.user?.username}</p>
              </div>
            </Link>
            {isOwner ? (
              <Button variant="outline" size="sm" onClick={remove} className="gap-1 text-red-600">
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            ) : (
              isAuthenticated && (
                <FollowButton size="sm" userId={memory.user_id} status={follow} onChange={(next) => setFollow(next)} />
              )
            )}
          </header>

          <PhotoCarousel
            images={images}
            alt={memory.title}
            placeholderTitle={memory.title}
            aspectClass="aspect-[4/3]"
            onDoubleClick={() => !liked && toggleLike()}
          />

          <div className="flex items-center gap-4 px-5 pt-4">
            <button type="button" onClick={toggleLike} aria-label="J'aime" className="flex items-center gap-1.5 transition hover:scale-105">
              <Heart className={`h-6 w-6 ${liked ? 'fill-red-500 text-red-500' : 'text-[#111A22]'}`} />
              <span className="text-sm font-medium">{formatNumber(likes)}</span>
            </button>
            <button type="button" onClick={() => !requireLogin() && setShareOpen(true)} aria-label="Partager" className="transition hover:scale-105">
              <Send className="h-6 w-6 text-[#111A22]" />
            </button>
            <button type="button" onClick={toggleSave} aria-label="Enregistrer" className="ml-auto transition hover:scale-105">
              <Bookmark className={`h-6 w-6 text-[#111A22] ${saved ? 'fill-[#111A22]' : ''}`} />
            </button>
          </div>

          <div className="space-y-3 px-5 pb-6 pt-3">
            <h1 className="text-2xl font-bold text-[#111A22]">{memory.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#7A8794]">
              {place && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {place}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(memory.travel_date).toLocaleDateString('fr-FR')}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {formatNumber(memory.views_count)} vues
              </span>
              <span className="flex items-center gap-1">
                <VisIcon className="h-4 w-4" />
                {visLabel}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-[#111A22]">
              <MentionText text={memory.description} />
            </p>
            {memory.tags && memory.tags.length > 0 && (
              <p className="flex flex-wrap gap-x-3 text-sm text-[#1F5F7B]">
                {memory.tags.map((t) => (
                  <Link key={t.id} href={`/explore?tag=${encodeURIComponent(t.slug)}`} className="hover:underline">
                    #{t.name}
                  </Link>
                ))}
              </p>
            )}

            {isOwner && (
              <div className="space-y-3 border-t border-[#E3E7EC] pt-4">
                {memory.photos && memory.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {memory.photos.map((p) => (
                      <div key={p.id} className="group relative h-16 w-16 overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => deletePhoto(p.id)}
                          aria-label="Supprimer la photo"
                          className="absolute inset-0 hidden items-center justify-center bg-black/55 text-white group-hover:flex"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {showAdd ? (
                  <>
                    <PhotoPicker files={addFiles} onChange={setAddFiles} existingCount={memory.photos?.length ?? 0} />
                    <div className="flex gap-2">
                      <Button onClick={uploadMore} disabled={!addFiles.length || uploading} className="bg-[#1F5F7B] text-white hover:bg-[#174B62]">
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Envoyer {addFiles.length ? `(${addFiles.length})` : ''}
                      </Button>
                      <Button variant="outline" onClick={() => { setShowAdd(false); setAddFiles([]); }}>
                        Annuler
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
                    Ajouter des photos
                  </Button>
                )}
              </div>
            )}
          </div>
        </article>

        <div className="mt-8">
          <CommentSection memoryId={memory.id} />
        </div>
      </div>

      <ShareDialog memoryId={memory.id} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
