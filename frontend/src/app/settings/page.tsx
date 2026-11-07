'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, Bell, Lock, Palette, ShieldCheck } from 'lucide-react';
import { socialApi } from '@/lib/api/social';
import type { PublicUser } from '@/types/social';
import { apiClient } from '@/lib/api/client';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nom trop court'),
  bio: z.string().max(500, 'Bio trop longue').optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

const passwordSchema = z.object({
  current_password: z.string().min(6, 'Mot de passe requis'),
  new_password: z.string().min(8, 'Mot de passe trop court'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm_password"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [notifications, setNotifications] = useState({
    email_likes: true,
    email_comments: true,
    email_follows: true,
    push_notifications: true,
  });
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isPrivate, setIsPrivate] = useState<boolean>(!!(user as any)?.is_private);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [blocked, setBlocked] = useState<PublicUser[]>([]);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      bio: user?.bio || '',
      country: (user as any)?.country || '',
      city: (user as any)?.city || '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (selectedTheme: 'light' | 'dark' | 'system') => {
    const isDark = selectedTheme === 'dark' || (selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    socialApi.blocks().then((r) => setBlocked(r.data ?? [])).catch(() => undefined);
    // Valeur à jour du serveur (le jeton local peut dater d'avant le changement)
    apiClient.get('/users/me').then((r: any) => setIsPrivate(!!r.data?.is_private)).catch(() => undefined);
  }, [isAuthenticated]);

  const handlePrivateChange = async (value: boolean) => {
    setPrivacyBusy(true);
    try {
      const res = await socialApi.setPrivate(value);
      setIsPrivate(!!res.data?.is_private);
      if (res.data) setUser({ ...(user as any), ...res.data });
    } catch (err) {
      console.error('Error updating privacy:', err);
    } finally {
      setPrivacyBusy(false);
    }
  };

  const handleUnblock = async (u: PublicUser) => {
    try {
      await socialApi.unblock(u.id);
      setBlocked((list) => list.filter((x) => x.id !== u.id));
    } catch (err) {
      console.error('Error unblocking:', err);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
      let avatarUrl = user?.avatar_url;

      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const response = await apiClient.upload('/users/avatar', avatarFile, 'avatar');
        if (response.success) {
          avatarUrl = response.data.avatar_url;
        }
      }

      const response = await apiClient.put('/users/me', { ...data, avatar_url: avatarUrl });
      if (response.success) {
        setUser(response.data);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordForm) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      if (response.success) {
        passwordForm.reset();
      }
    } catch (err) {
      console.error('Error changing password:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-gray-500">Gérez vos préférences et informations personnelles</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />Profil</TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2"><ShieldCheck className="h-4 w-4" />Confidentialité</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Lock className="h-4 w-4" />Sécurité</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Palette className="h-4 w-4" />Apparence</TabsTrigger>
        </TabsList>

        {/* Onglet Profil */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Modifiez vos informations personnelles</CardDescription>
            </CardHeader>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)}>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarPreview} />
                    <AvatarFallback>{user?.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="avatar" className="cursor-pointer">
                      <Button type="button" variant="outline" asChild>
                        <span>Changer la photo</span>
                      </Button>
                    </Label>
                    <Input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG ou WebP. Max 5MB.</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nom complet</Label>
                    <Input id="full_name" {...profileForm.register('full_name')} />
                    {profileForm.formState.errors.full_name && <p className="text-sm text-red-500">{profileForm.formState.errors.full_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea id="bio" rows={3} className="w-full rounded-md border p-2" {...profileForm.register('bio')} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="country">Pays</Label>
                      <Input id="country" {...profileForm.register('country')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Ville</Label>
                      <Input id="city" {...profileForm.register('city')} />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enregistrer
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Onglet Confidentialité */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Confidentialité</CardTitle>
              <CardDescription>Contrôlez qui peut voir vos souvenirs et vous contacter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Compte privé</Label>
                  <p className="text-sm text-gray-500">
                    Seuls les abonnés que vous acceptez voient vos souvenirs et vos stories. Les nouveaux abonnés doivent envoyer une demande.
                  </p>
                </div>
                <Switch checked={isPrivate} disabled={privacyBusy} onCheckedChange={handlePrivateChange} />
              </div>
              <Separator />
              <div>
                <Label>Utilisateurs bloqués</Label>
                {blocked.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-500">Vous n&apos;avez bloqué personne.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {blocked.map((u) => (
                      <li key={u.id} className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback>{u.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{u.full_name}</p>
                          <p className="text-xs text-gray-500">@{u.username}</p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => handleUnblock(u)}>
                          Débloquer
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Sécurité */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>Modifiez votre mot de passe</CardDescription>
            </CardHeader>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Mot de passe actuel</Label>
                  <Input id="current_password" type="password" {...passwordForm.register('current_password')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">Nouveau mot de passe</Label>
                  <Input id="new_password" type="password" {...passwordForm.register('new_password')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
                  <Input id="confirm_password" type="password" {...passwordForm.register('confirm_password')} />
                  {passwordForm.formState.errors.confirm_password && <p className="text-sm text-red-500">{passwordForm.formState.errors.confirm_password.message}</p>}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Changer le mot de passe
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Onglet Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choisissez les notifications que vous souhaitez recevoir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Nouveaux likes</Label><p className="text-sm text-gray-500">Quand quelqu'un aime votre mémoire</p></div>
                <Switch checked={notifications.email_likes} onCheckedChange={() => handleNotificationChange('email_likes')} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><Label>Nouveaux commentaires</Label><p className="text-sm text-gray-500">Quand quelqu'un commente votre mémoire</p></div>
                <Switch checked={notifications.email_comments} onCheckedChange={() => handleNotificationChange('email_comments')} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><Label>Nouveaux abonnés</Label><p className="text-sm text-gray-500">Quand quelqu'un vous suit</p></div>
                <Switch checked={notifications.email_follows} onCheckedChange={() => handleNotificationChange('email_follows')} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Apparence */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>Personnalisez l'apparence du site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Thème clair</Label><p className="text-sm text-gray-500">Interface lumineuse</p></div>
                <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => handleThemeChange('light')}>Activer</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><Label>Thème sombre</Label><p className="text-sm text-gray-500">Interface sombre pour les yeux</p></div>
                <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => handleThemeChange('dark')}>Activer</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><Label>Système</Label><p className="text-sm text-gray-500">Suivre les préférences système</p></div>
                <Button variant={theme === 'system' ? 'default' : 'outline'} onClick={() => handleThemeChange('system')}>Activer</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}