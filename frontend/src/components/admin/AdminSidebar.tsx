'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Flag, LayoutDashboard, MapPin, Settings, Users } from 'lucide-react';

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/memories', label: 'Memoires', icon: MapPin },
  { href: '/admin/reports', label: 'Signalements', icon: Flag },
  { href: '/admin/analytics', label: 'Analytiques', icon: BarChart3 },
  { href: '/admin/settings', label: 'Parametres', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-white dark:bg-gray-800">
      <div className="flex h-16 items-center border-b px-5">
        <div>
          <h1 className="text-lg font-bold text-blue-600">Travel Admin</h1>
          <p className="text-xs text-gray-500">Operations & moderation</p>
        </div>
      </div>

      <nav className="space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
