'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { AdminStats, ActivityLog } from '@/types/admin';
import { ActivityChart } from '@/components/admin/ActivityChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { BarChart3, Clock, Flag, Heart, Loader2, MessageCircle, TrendingUp, Users } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { error: showError } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        const [statsResponse, logsResponse] = await Promise.all([
          adminApi.getStats(),
          adminApi.getActivityLogs(1, 8),
        ]);

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        }

        if (logsResponse.success && logsResponse.data?.logs) {
          setActivities(logsResponse.data.logs);
        }
      } catch {
        showError('Erreur lors du chargement des analytiques');
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [showError]);

  const ratios = useMemo(() => {
    if (!stats) return null;

    const engagementBase = Math.max(stats.total_memories, 1);
    return {
      likesPerMemory: stats.total_likes / engagementBase,
      commentsPerMemory: stats.total_comments / engagementBase,
      activeUserRate: stats.total_users > 0 ? (stats.active_users / stats.total_users) * 100 : 0,
      moderationLoad: stats.total_memories > 0 ? (stats.pending_reports / stats.total_memories) * 100 : 0,
    };
  }, [stats]);

  if (isLoading || !stats || !ratios) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytiques</h1>
        <p className="mt-1 text-gray-500">Vue operationnelle sur la croissance, l'engagement et la moderation.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Taux utilisateurs actifs"
          value={`${ratios.activeUserRate.toFixed(0)}%`}
          description={`${stats.active_users} actifs sur ${stats.total_users} comptes`}
          icon={<Users className="h-5 w-5 text-blue-500" />}
        />
        <MetricCard
          title="Likes par memoire"
          value={ratios.likesPerMemory.toFixed(1)}
          description="Mesure la resonance des contenus publies"
          icon={<Heart className="h-5 w-5 text-red-500" />}
        />
        <MetricCard
          title="Commentaires par memoire"
          value={ratios.commentsPerMemory.toFixed(1)}
          description="Indique la profondeur des conversations"
          icon={<MessageCircle className="h-5 w-5 text-purple-500" />}
        />
        <MetricCard
          title="Charge moderation"
          value={`${ratios.moderationLoad.toFixed(1)}%`}
          description={`${stats.pending_reports} signalements en attente`}
          icon={<Flag className="h-5 w-5 text-yellow-500" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Evolution de l'activite
            </CardTitle>
            <CardDescription>Suivi des tendances recentes de la plateforme.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Croissance
            </CardTitle>
            <CardDescription>Variation recente des signaux principaux.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GrowthRow label="Utilisateurs" value={stats.growth.users} />
            <GrowthRow label="Memoires" value={stats.growth.memories} />
            <GrowthRow label="Engagement" value={stats.growth.engagement} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Dernieres actions
          </CardTitle>
          <CardDescription>Activites recentes utiles pour diagnostiquer les pics.</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="py-8 text-center text-gray-500">Aucune activite recente.</p>
          ) : (
            <div className="divide-y">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{activity.username}</span>
                      <Badge variant="outline">{activity.action}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {activity.target_type} #{activity.target_id}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function GrowthRow({ label, value }: { label: string; value: number }) {
  const isPositive = value >= 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}
          {value}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${isPositive ? 'bg-green-600' : 'bg-red-500'}`}
          style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
        />
      </div>
    </div>
  );
}
