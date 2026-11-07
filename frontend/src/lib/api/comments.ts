import { apiClient } from './client';

export interface Comment {
  id: number;
  user_id: number;
  memory_id: number;
  parent_id?: number;
  content: string;
  likes_count: number;
  created_at: string;
  user?: {
    username: string;
    avatar_url: string;
    full_name: string;
  };
  is_liked?: boolean;
  replies?: Comment[];
}

export const commentsApi = {
  // Récupérer les commentaires d'une mémoire
  getByMemory: async (memoryId: number): Promise<{ success: boolean; data: Comment[] }> => {
    return apiClient.get(`/memories/${memoryId}/comments`);
  },

  // Ajouter un commentaire
  create: async (memoryId: number, content: string): Promise<{ success: boolean; data: Comment }> => {
    return apiClient.post(`/memories/${memoryId}/comments`, { content });
  },

  // Modifier un commentaire
  update: async (commentId: number, content: string): Promise<{ success: boolean; data: Comment }> => {
    return apiClient.put(`/comments/${commentId}`, { content });
  },

  // Supprimer un commentaire
  delete: async (commentId: number): Promise<{ success: boolean }> => {
    return apiClient.delete(`/comments/${commentId}`);
  },

  // Liker un commentaire
  like: async (commentId: number): Promise<{ success: boolean; data: { likes_count: number } }> => {
    return apiClient.post(`/comments/${commentId}/like`);
  },

  // Unliker un commentaire
  unlike: async (commentId: number): Promise<{ success: boolean; data: { likes_count: number } }> => {
    return apiClient.delete(`/comments/${commentId}/like`);
  },
};