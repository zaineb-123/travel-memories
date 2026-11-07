'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MapPin, Upload } from 'lucide-react';
import { memorySchema, MemoryInput } from '@/lib/validations';
import { memoriesApi } from '@/lib/api/memories';
import { uploadApi } from '@/lib/api/upload';
import { geocodePlace } from '@/lib/geocode';
import { getErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/authStore';
import { CountryReveal } from '@/components/passport/CountryReveal';
import { statsApi } from '@/lib/api/stats';
import { isNewCountry, toVisited, type VisitedCountry } from '@/lib/travel';
import { PhotoPicker } from '@/components/memories/PhotoPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const today = () => new Date().toISOString().slice(0, 10);

function parseTags(raw: string): string[] {
  return [...new Set(raw.split(/[,\s]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean))].slice(0, 10);
}

export default function CreateMemoryPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [reveal, setReveal] = useState<{ id: number; country: string; date: string; before: VisitedCountry[] } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [tagsText, setTagsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MemoryInput>({
    resolver: zodResolver(memorySchema),
    defaultValues: { visibility: 'public', travel_date: today() },
  });

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return setFormError('Géolocalisation non supportée');
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        setValue('latitude', lat);
        setValue('longitude', lng);
        setIsGettingLocation(false);
      },
      () => {
        setFormError('Impossible de récupérer votre position');
        setIsGettingLocation(false);
      },
    );
  };

  const onSubmit = async (data: MemoryInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: MemoryInput = { ...data, city: data.city?.trim() || undefined, tags: parseTags(tagsText) };

      // Sans position choisie, on place le souvenir d'après la ville/le pays : il apparaît sur la carte.
      if (payload.latitude == null || payload.longitude == null) {
        setStep('Recherche du lieu sur la carte…');
        const found = await geocodePlace(payload.city, payload.country);
        if (found) {
          payload.latitude = found.lat;
          payload.longitude = found.lng;
        }
      }

      // Pays déjà coloriés avant ce souvenir : sert à savoir si celui-ci en colorie un nouveau.
      let before: VisitedCountry[] | null = null;
      if (user && payload.visibility === 'public') {
        try {
          before = toVisited((await statsApi.travel(user.username)).data.countries);
        } catch {
          before = null;
        }
      }

      setStep('Publication…');
      const created = await memoriesApi.create(payload);
      const id = created.data.id;

      if (photos.length) {
        setStep(`Envoi des photos (${photos.length})…`);
        try {
          await uploadApi.uploadMultiplePhotos(id, photos);
        } catch (e) {
          window.alert(`Le souvenir est publié, mais l'envoi des photos a échoué : ${getErrorMessage(e)}\nVous pourrez les ajouter depuis la page du souvenir.`);
        }
      }
      if (before && isNewCountry(before, payload.country)) {
        setReveal({ id, country: payload.country, date: payload.travel_date, before });
        return;
      }
      router.push(`/memory/${id}`);
    } catch (e) {
      setFormError(getErrorMessage(e));
      setSubmitting(false);
      setStep('');
    }
  };

  if (reveal) {
    return (
      <CountryReveal
        country={reveal.country}
        date={reveal.date}
        visitedBefore={reveal.before}
        onContinue={() => router.push(`/memory/${reveal.id}`)}
        onPassport={() => router.push(`/profile/${user?.username ?? ''}`)}
      />
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card className="rounded-[24px] border-[#E3E7EC]">
        <CardHeader>
          <CardTitle className="font-display text-[36px]">Partager un souvenir</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Photos */}
            <div className="space-y-2">
              <Label>Photos</Label>
              <PhotoPicker files={photos} onChange={setPhotos} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input id="title" placeholder="Mon voyage inoubliable..." {...register('title')} />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Racontez votre expérience… (identifiez un voyageur avec @pseudo)"
                rows={5}
                {...register('description')}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="désert, plage, roadtrip" />
              <p className="text-xs text-[#7A8794]">Séparés par des virgules (10 maximum).</p>
            </div>

            <div className="space-y-2">
              <Label>Localisation *</Label>
              <div className="flex gap-2">
                <Input placeholder="Pays" {...register('country')} className="flex-1" />
                <Input placeholder="Ville" {...register('city')} className="flex-1" />
              </div>
              {errors.country && <p className="text-sm text-red-500">{errors.country.message}</p>}

              <Button type="button" variant="outline" onClick={getCurrentLocation} disabled={isGettingLocation} className="w-full">
                {isGettingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                {location ? 'Position mise à jour ✓' : 'Ajouter ma position actuelle'}
              </Button>
              {location ? (
                <p className="text-xs text-green-600">
                  ✓ Position : {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
              ) : (
                <p className="text-xs text-[#7A8794]">Sans position, le souvenir est placé d&apos;après la ville et le pays.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="travel_date">Date du voyage *</Label>
              <Input type="date" id="travel_date" max={today()} {...register('travel_date')} />
              {errors.travel_date && <p className="text-sm text-red-500">{errors.travel_date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Visibilité</Label>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ['public', '🌍 Public'],
                    ['followers', '👥 Abonnés uniquement'],
                    ['private', '🔒 Privé'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2">
                    <input type="radio" value={value} {...register('visibility')} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {formError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} className="rounded-xl bg-[#111A22] text-white hover:bg-[#2A3844]">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Publier
              </Button>
              {step && <span className="text-sm text-[#7A8794]">{step}</span>}
            </div>
            <p className="text-xs text-[#7A8794]">
              En publiant, vous acceptez notre <Link href="/privacy" className="underline">politique de confidentialité</Link>.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
