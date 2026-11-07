import { apiClient } from './client';
import { User } from '@/types';

export interface ProfileResponse {
  success: boolean;
  data: {
    user: User;
    recent_memories?: any[];
    is_following: boolean;
    follow_status: 'none' | 'following' | 'requested';
    is_friend: boolean;
    is_blocked: boolean;
  };
}

export const profileApi = {
  // Récupérer son profil
  getMe: async (): Promise<{ success: boolean; data: User }> => {
    return apiClient.get('/users/me');
  },

  // Récupérer un profil par username
  getByUsername: async (username: string): Promise<ProfileResponse> => {
    return apiClient.get(`/users/${username}`);
  },

  // Mettre à jour son profil
  update: async (data: Partial<User>): Promise<{ success: boolean; data: User }> => {
    return apiClient.put('/users/me', data);
  },

  // Upload avatar
  uploadAvatar: async (file: File): Promise<{ success: boolean; data: { avatar_url: string } }> => {
    return apiClient.upload('/users/avatar', file, 'avatar');
  },

  // Suivre un utilisateur
  follow: async (userId: number): Promise<{ success: boolean; message: string }> => {
    return apiClient.post(`/users/${userId}/follow`);
  },

  // Ne plus suivre un utilisateur
  unfollow: async (userId: number): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/users/${userId}/follow`);
  },

  // Liste des followers
  getFollowers: async (username: string, page = 1): Promise<{ success: boolean; data: User[] }> => {
    return apiClient.get(`/users/${username}/followers?page=${page}`);
  },

  // Liste des following
  getFollowing: async (username: string, page = 1): Promise<{ success: boolean; data: User[] }> => {
    return apiClient.get(`/users/${username}/following?page=${page}`);
  },
};