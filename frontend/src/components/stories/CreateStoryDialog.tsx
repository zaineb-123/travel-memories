/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { storiesApi } from '@/lib/api/stories';
import { getErrorMessage } from '@/lib/api/errors';
import { validateImageFile } from '@/lib/validations';

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateStoryDialog({ open, onOpenChange, onCreated }: CreateStoryDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [place, setPlace] = useState('');
  const [visibility, setVisibility] = useState<'followers' | 'public'>('followers');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) return;
    setFile(null);
    setCaption('');
    setPlace('');
    setCoords(null);
    setError(null);
    setVisibility('followers');
  }, [open]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f?: File) => {
    if (!f) return;
    const check = validateImageFile(f);
    if (!check.valid) return setError(check.error ?? 'Image invalide');
    setError(null);
    setFile(f);
  };

  const locate = () => {
    if (!navigator.geolocation) return setError('Géolocalisation non supportée');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setError('Impossible de récupérer votre position');
        setLocating(false);
      },
    );
  };

  const submit = async () => {
    if (!file) return setError('Ajoutez une photo');
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      if (caption.trim()) form.append('caption', caption.trim());
      if (place.trim()) form.append('location_name', place.trim());
      form.append('visibility', visibility);
      if (coords) {
        form.append('latitude', String(coords.lat));
        form.append('longitude', String(coords.lng));
      }
      await storiesApi.create(form);
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle story</DialogTitle>
          <DialogDescription>Visible pendant 24 h, puis supprimée automatiquement.</DialogDescription>
        </DialogHeader>

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        {preview ? (
          <div className="relative mx-auto aspect-[9/16] max-h-80 overflow-hidden rounded-xl bg-black">
            <img src={preview} alt="Aperçu de la story" className="h-full w-full object-contain" />
            <Button type="button" size="sm" variant="secondary" className="absolute bottom-2 right-2" onClick={() => fileRef.current?.click()}>
              Changer
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#B9C3CC] text-[#7A8794] hover:bg-[#F4F5F7]"
          >
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm">Choisir une photo</span>
          </button>
        )}

        <Input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} placeholder="Légende (facultatif)" />
        <Input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={200} placeholder="Lieu (ex. Djerba, Tunisie)" />

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating} className="gap-1">
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {coords ? 'Position ajoutée ✓' : 'Ajouter ma position (carte)'}
          </Button>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'followers' | 'public')}
            className="ml-auto h-8 rounded-lg border border-[#E3E7EC] bg-white px-2 text-sm"
            aria-label="Visibilité"
          >
            <option value="followers">Abonnés</option>
            <option value="public">Public</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="button" onClick={submit} disabled={!file || busy} className="w-full bg-[#1F5F7B] text-white hover:bg-[#174B62]">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Publier la story
        </Button>
      </DialogContent>
    </Dialog>
  );
}
