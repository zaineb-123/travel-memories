import { apiClient } from './client';
import { User } from '@/types';

export const followsApi = {
  // Suivre un utilisateur
  follow: async (userId: number): Promise<{ success: boolean; message: string }> => {
    return apiClient.post(`/users/${userId}/follow`);
  },

  // Ne plus suivre
  unfollow: async (userId: number): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/users/${userId}/follow`);
  },

  // Vérifier si on suit un utilisateur
  isFollowing: async (userId: number): Promise<{ success: boolean; data: { is_following: boolean } }> => {
    return apiClient.get(`/users/${userId}/is-following`);
  },

  // Liste des followers
  getFollowers: async (userId: number, page = 1): Promise<{ success: boolean; data: User[]; pagination: any }> => {
    return apiClient.get(`/users/${userId}/followers?page=${page}`);
  },

  // Liste des following
  getFollowing: async (userId: number, page = 1): Promise<{ success: boolean; data: User[]; pagination: any }> => {
    return apiClient.get(`/users/${userId}/following?page=${page}`);
  },
};