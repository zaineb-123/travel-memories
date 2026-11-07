'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User } from '@/types';
import { profileApi } from '@/lib/api/profile';
import { uploadApi } from '@/lib/api/upload';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nom trop court'),
  bio: z.string().max(500, 'Bio trop longue').optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
  onUpdate: (data: Partial<User>) => void;
}

export function EditProfileModal({ open, onClose, user, onUpdate }: EditProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user.avatar_url);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user.full_name,
      bio: user.bio || '',
      country: user.country || '',
      city: user.city || '',
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    setError(null);

    try {
      if (avatarFile) {
        // L'API met l'avatar à jour elle-même et renvoie la nouvelle URL.
        await uploadApi.uploadAvatar(avatarFile);
      }

      const result = await profileApi.update({
        full_name: data.full_name,
        bio: data.bio || undefined,
        country: data.country || undefined,
        city: data.city || undefined,
      } as Partial<User>);

      if (result.success) {
        onUpdate(result.data);
        onClose();
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>
            Modifiez vos informations personnelles
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Avatar */}
          <div className="space-y-2">
            <Label>Photo de profil</Label>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarPreview || '/default-avatar.png'}
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover"
              />
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="flex-1"
              />
            </div>
          </div>
          
          {/* Full name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Nom complet</Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && (
              <p className="text-sm text-red-500">{errors.full_name.message}</p>
            )}
          </div>
          
          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={3} {...register('bio')} />
            {errors.bio && (
              <p className="text-sm text-red-500">{errors.bio.message}</p>
            )}
          </div>
          
          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">Pays</Label>
            <Input id="country" placeholder="France" {...register('country')} />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" placeholder="Paris" {...register('city')} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}