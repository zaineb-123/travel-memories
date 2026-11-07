import { AdminStats } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Flag,
  HardDrive,
  Heart,
  MapPin,
  MessageCircle,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';

interface StatsCardsProps {
  stats: AdminStats;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

const formatStorage = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
};

export function StatsCards({ stats }: StatsCardsProps) {
  const storageRatio = stats.storage_limit > 0
    ? Math.min((stats.storage_used / stats.storage_limit) * 100, 100)
    : 0;

  const cards = [
    {
      title: 'Utilisateurs',
      value: formatNumber(stats.total_users),
      subValue: `+${stats.new_users_today} aujourd'hui`,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Memoires',
      value: formatNumber(stats.total_memories),
      subValue: `+${stats.new_memories_today} aujourd'hui`,
      icon: MapPin,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: 'Likes',
      value: formatNumber(stats.total_likes),
      subValue: `${formatNumber(stats.total_likes)} reactions totales`,
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
    {
      title: 'Commentaires',
      value: formatNumber(stats.total_comments),
      subValue: `${formatNumber(stats.total_follows)} abonnements`,
      icon: MessageCircle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: 'Utilisateurs actifs',
      value: formatNumber(stats.active_users),
      subValue: `${formatNumber(stats.total_users - stats.active_users)} non actifs`,
      icon: UserCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    },
    {
      title: 'Comptes bannis',
      value: formatNumber(stats.banned_users),
      subValue: 'A surveiller chaque semaine',
      icon: UserX,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      title: 'Signalements',
      value: formatNumber(stats.pending_reports),
      subValue: stats.pending_reports > 0 ? 'Action requise' : 'File de moderation vide',
      icon: Flag,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    },
    {
      title: 'Stockage utilise',
      value: `${storageRatio.toFixed(0)}%`,
      subValue: `${formatStorage(stats.storage_used)} / ${formatStorage(stats.storage_limit)}`,
      icon: HardDrive,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-gray-500">{card.subValue}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
