'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, LogOut, Settings, User } from 'lucide-react';

export function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 dark:bg-gray-800">
      <div>
        <h2 className="text-lg font-semibold">Bon retour, {user?.full_name || 'Admin'}</h2>
        <p className="text-xs text-gray-500">Surveillez la moderation, la qualite et la croissance.</p>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative" onClick={() => router.push('/admin/reports')}>
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
            !
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback>{user?.full_name?.charAt(0) || 'A'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.full_name}</span>
                <span className="text-xs text-gray-500">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/profile/${user?.username}`)}>
              <User className="mr-2 h-4 w-4" />
              Profil public
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Parametres admin
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Deconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
