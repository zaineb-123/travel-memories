'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Filter, TrendingUp, Clock, Flame } from 'lucide-react';

interface FeedFiltersProps {
  activeTab: 'public' | 'following' | 'explore';
  onTabChange: (tab: 'public' | 'following' | 'explore') => void;
  sortBy: 'recent' | 'popular' | 'trending';
  onSortChange: (sort: 'recent' | 'popular' | 'trending') => void;
  showFilters?: boolean;
}

export function FeedFilters({
  activeTab,
  onTabChange,
  sortBy,
  onSortChange,
  showFilters = true,
}: FeedFiltersProps) {
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="public">🌍 Découvrir</TabsTrigger>
          <TabsTrigger value="following">👥 Abonnements</TabsTrigger>
          <TabsTrigger value="explore">✨ Explorer</TabsTrigger>
        </TabsList>
      </Tabs>

      {showFilters && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="h-4 w-4" />
            <span>Trier par:</span>
          </div>
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as any)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Récents
                </div>
              </SelectItem>
              <SelectItem value="popular">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  Populaires
                </div>
              </SelectItem>
              <SelectItem value="trending">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tendances
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}