'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Compass, PlusCircle, LogOut, User, Settings, Globe, Heart, Bell, Send, Plus, BookUser } from 'lucide-react';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const unread = useUnreadCounts();

  const navItems = [
    { href: '/explore', label: 'Explorer' },
    { href: '/my-map', label: 'Carte' },
    { href: '/feed', label: "Fil d'actualité" },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.username) return user.username.charAt(0).toUpperCase();
    return '?';
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#F4F5F7]/90 backdrop-blur-md">
      <div className="mx-auto grid h-[72px] max-w-[1480px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:h-20 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-[#111A22]" aria-label="Travel Memories, accueil">
          <MapPin className="h-6 w-6" strokeWidth={1.6} />
          <span className="font-serif text-[26px] font-normal leading-none tracking-[-0.01em] max-sm:hidden">Travel Memories</span>
        </Link>

        {/* Navigation centrale */}
        <div className="hidden items-center justify-center gap-10 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`border-b-2 pb-1 text-[17px] transition-colors ${
                  isActive ? 'border-[#111A22] font-medium text-[#111A22]' : 'border-transparent text-[#46525E] hover:text-[#111A22]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <span className="md:hidden" />

        {/* Actions droite */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/create"
                className="mr-1 inline-flex h-[50px] items-center gap-2.5 rounded-xl bg-[#111A22] px-5 text-[16px] font-medium text-white transition hover:bg-[#2A3844] max-sm:h-10 max-sm:px-3"
              >
                <Plus className="h-[18px] w-[18px]" />
                <span className="max-sm:hidden">Nouveau souvenir</span>
              </Link>
              <Link href="/messages" aria-label={unread.messages ? `Messages, ${unread.messages} non lus` : 'Messages'} className="relative rounded-full p-2.5 text-[#111A22] hover:bg-white">
                <Send className="h-6 w-6" strokeWidth={1.5} />
                {unread.messages > 0 && <Dot />}
              </Link>
              <Link
                href="/notifications"
                aria-label={unread.notifications ? `Notifications, ${unread.notifications} non lues` : 'Notifications'}
                className="relative rounded-full p-2.5 text-[#111A22] hover:bg-white"
              >
                <Bell className="h-6 w-6" strokeWidth={1.5} />
                {unread.notifications > 0 && <Dot />}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-[52px] w-[52px] rounded-full p-0 max-sm:h-10 max-sm:w-10" aria-label="Mon compte">
                    <Avatar className="h-[52px] w-[52px] max-sm:h-10 max-sm:w-10">
                      <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                      <AvatarFallback className="bg-[#E3EDF2] text-[#1F5F7B]">{getInitial()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium text-[#111A22]">{user?.full_name}</span>
                      <span className="text-xs text-[#7A8794]">@{user?.username}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(`/profile/${user?.username}`)}>
                    <BookUser className="mr-2 h-4 w-4" />
                    Mon passeport
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <Heart className="mr-2 h-4 w-4" />
                      Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-xl px-4 py-2.5 text-[16px] text-[#46525E] hover:text-[#111A22]">
                Connexion
              </Link>
              <Link href="/register" className="rounded-xl bg-[#111A22] px-5 py-2.5 text-[16px] font-medium text-white hover:bg-[#2A3844]">
                Inscription
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

/** Petit point laiton : il y a du nouveau (le nombre exact est dans le libellé du lien). */
function Dot() {
  return <span aria-hidden className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-[#F4F5F7] bg-[#B8944D]" />;
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
      {n > 9 ? '9+' : n}
    </span>
  );
}

/** Barre de navigation en bas de l'écran sur mobile (le menu central est masqué sous 768 px). */
export function MobileNav() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const unread = useUnreadCounts();
  if (!isAuthenticated) return null;
  const items = [
    { href: '/feed', icon: Compass, label: 'Fil' },
    { href: '/explore', icon: Globe, label: 'Explorer' },
    { href: '/create', icon: PlusCircle, label: 'Créer' },
    { href: '/my-map', icon: MapPin, label: 'Carte' },
    { href: '/messages', icon: Send, label: 'Messages', badge: unread.messages },
    { href: `/profile/${user?.username}`, icon: User, label: 'Profil' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-[#E3E7EC] bg-white/95 py-2 backdrop-blur md:hidden">
      {items.map(({ href, icon: Icon, label, badge }) => (
        <Link
          key={label}
          href={href}
          aria-label={label}
          className={`relative flex flex-col items-center px-2 text-[10px] ${pathname === href ? 'text-[#1F5F7B]' : 'text-[#46525E]'}`}
        >
          <Icon className="h-5 w-5" />
          {label}
          {!!badge && <Badge n={badge} />}
        </Link>
      ))}
    </nav>
  );
}
