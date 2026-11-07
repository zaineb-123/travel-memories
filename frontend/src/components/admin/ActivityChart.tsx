'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
  date: string;
  users: number;
  memories: number;
  likes: number;
}

export function ActivityChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simuler le chargement des données
    const loadData = async () => {
      setIsLoading(true);
      // Ici tu peux appeler ton API pour récupérer les stats par jour
      // Pour l'instant, on utilise des données de démonstration
      const demoData: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        demoData.push({
          date: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
          users: Math.floor(Math.random() * 50) + 10,
          memories: Math.floor(Math.random() * 100) + 20,
          likes: Math.floor(Math.random() * 500) + 100,
        });
      }
      setData(demoData);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const maxValue = Math.max(...data.flatMap(d => [d.users, d.memories, d.likes]));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activité des 7 derniers jours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité des 7 derniers jours</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-64 items-end gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-blue-500 transition-all hover:bg-blue-600"
                  style={{ height: `${(item.users / maxValue) * 150}px` }}
                  title={`${item.users} utilisateurs`}
                />
                <div
                  className="w-full rounded-t bg-green-500 transition-all hover:bg-green-600"
                  style={{ height: `${(item.memories / maxValue) * 150}px` }}
                  title={`${item.memories} mémoires`}
                />
                <div
                  className="w-full rounded-t bg-red-500 transition-all hover:bg-red-600"
                  style={{ height: `${(item.likes / maxValue) * 150}px` }}
                  title={`${item.likes} likes`}
                />
              </div>
              <span className="text-xs text-gray-500">{item.date}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-blue-500" />
            <span>Utilisateurs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-green-500" />
            <span>Mémoires</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-red-500" />
            <span>Likes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}