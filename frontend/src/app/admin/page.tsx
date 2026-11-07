'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin';
import { ActivityLog, AdminStats } from '@/types/admin';
import { StatsCards } from '@/components/admin/StatsCards';
import { ActivityChart } from '@/components/admin/ActivityChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { AlertCircle, ArrowRight, Clock, Flag, Loader2, TrendingUp } from 'lucide-react';

export default function AdminDashboardPage() {
  const { error: showError } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [statsResponse, activityResponse] = await Promise.all([
          adminApi.getStats(),
          adminApi.getActivityLogs(1, 10),
        ]);

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        }

        if (activityResponse.success && activityResponse.data?.logs) {
          setActivities(activityResponse.data.logs);
        }
      } catch {
        showError('Erreur lors du chargement du dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [showError]);

  if (isLoading || !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Vue centrale pour suivre les utilisateurs, les memoires et la moderation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/reports">
              <Flag className="mr-2 h-4 w-4" />
              Signalements
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/analytics">
              Analytiques
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <StatsCards stats={stats} />

      {stats.pending_reports > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">{stats.pending_reports} signalements en attente</p>
                  <p className="text-sm">Traitez-les rapidement pour garder la plateforme fiable.</p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link href="/admin/reports">Examiner</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activites recentes
            </CardTitle>
            <CardDescription>Derniers evenements utiles pour surveiller la plateforme.</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="py-8 text-center text-gray-500">Aucune activite recente</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 border-b pb-4 last:border-0">
                    <div className="mt-1 rounded-full bg-blue-100 p-2 text-blue-600">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">{activity.username}</span>
                        <Badge variant="outline" className="text-xs">{activity.action}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {activity.target_type} #{activity.target_id} - {new Date(activity.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Croissance
            </CardTitle>
            <CardDescription>Variation recente des indicateurs cles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GrowthMetric label="Utilisateurs" value={stats.growth.users} />
            <GrowthMetric label="Memoires" value={stats.growth.memories} />
            <GrowthMetric label="Engagement" value={stats.growth.engagement} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques en temps reel</CardTitle>
          <CardDescription>Visualisation rapide des volumes recents.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityChart />
        </CardContent>
      </Card>
    </div>
  );
}

function GrowthMetric({ label, value }: { label: string; value: number }) {
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
