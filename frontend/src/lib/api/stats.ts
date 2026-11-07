import { apiClient } from './client';

export interface TravelCountry {
  country: string;
  memories: number;
  /** Date du premier souvenir dans ce pays : c'est la date du tampon. */
  first_date: string;
  last_date: string;
  dates: string[];
}

export interface TravelPlace {
  id: number;
  title: string;
  city: string | null;
  country: string;
  latitude: number;
  longitude: number;
  cover_image: string;
  travel_date: string;
}

export interface TravelStats {
  total_memories: number;
  total_countries: number;
  total_photos: number;
  total_likes: number;
  first_trip: string | null;
  last_trip: string | null;
  world_percentage: number;
  countries: TravelCountry[];
  places: TravelPlace[];
  badges: { id: string; label: string }[];
}

export interface FriendStamp {
  username: string;
  full_name: string;
  avatar_url: string;
  country: string;
  date: string;
}

export interface FriendsStats {
  stamps: FriendStamp[];
  countries: { country: string; friends: number }[];
}

export const statsApi = {
  travel: (username: string): Promise<{ success: boolean; data: TravelStats }> => apiClient.get(`/stats/travel/${encodeURIComponent(username)}`),
  friends: (): Promise<{ success: boolean; data: FriendsStats }> => apiClient.get('/stats/friends'),
};
