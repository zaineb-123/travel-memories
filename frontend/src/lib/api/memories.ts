import { apiClient } from './client';
import { Memory } from '@/types';
import { MemoryInput } from '@/lib/validations';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MemoriesResponse {
  success: boolean;
  data: { memories: Memory[]; pagination: Pagination };
}

export interface MemoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  tag?: string;
  username?: string;
  mine?: boolean;
  feed?: 'following';
  has_location?: boolean;
  sort?: 'recent' | 'popular' | 'views';
}

export const memoriesApi = {
  /** Liste filtrée (le jeton est ajouté automatiquement : on voit aussi ses propres souvenirs et ceux de ses abonnements). */
  list: async (params: MemoryListParams = {}): Promise<MemoriesResponse> => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
    return apiClient.get('/memories', clean);
  },

  getAll: async (page = 1, limit = 12): Promise<MemoriesResponse> => memoriesApi.list({ page, limit }),

  /** Souvenirs d'un voyageur (le tableau est dans `data`, la pagination à la racine). */
  byUser: async (
    username: string,
    page = 1,
  ): Promise<{ success: boolean; data: Memory[]; pagination: Pagination }> =>
    apiClient.get(`/memories/user/${encodeURIComponent(username)}`, { page, limit: 24 }),

  favorites: async (page = 1): Promise<MemoriesResponse> => apiClient.get('/memories/favorites', { page, limit: 24 }),

  getById: async (id: number): Promise<{ success: boolean; data: Memory }> => apiClient.get(`/memories/${id}`),

  create: async (
    data: MemoryInput,
  ): Promise<{ success: boolean; data: Memory; message: string }> => apiClient.post('/memories', data),

  update: async (id: number, data: Partial<MemoryInput>): Promise<{ success: boolean; data: Memory }> =>
    apiClient.put(`/memories/${id}`, data),

  delete: async (id: number): Promise<{ success: boolean; message: string }> => apiClient.delete(`/memories/${id}`),

  like: async (id: number): Promise<{ success: boolean; data: { likes_count: number } }> =>
    apiClient.post(`/memories/${id}/like`),

  unlike: async (id: number): Promise<{ success: boolean; data: { likes_count: number } }> =>
    apiClient.delete(`/memories/${id}/like`),

  addFavorite: async (id: number): Promise<{ success: boolean }> => apiClient.post(`/memories/${id}/favorite`),

  removeFavorite: async (id: number): Promise<{ success: boolean }> => apiClient.delete(`/memories/${id}/favorite`),

  uploadPhoto: async (memoryId: number, file: File): Promise<{ success: boolean; data: { image_url: string } }> =>
    apiClient.upload(`/memories/${memoryId}/photos`, file, 'photo'),

  deletePhoto: async (memoryId: number, photoId: number): Promise<{ success: boolean }> =>
    apiClient.delete(`/memories/${memoryId}/photos/${photoId}`),

  comment: async (memoryId: number, content: string) => apiClient.post(`/memories/${memoryId}/comments`, { content }),
};

/** Photos d'un souvenir sous forme d'URLs (cover en repli quand la liste des photos est vide). */
export function memoryImages(m: Pick<Memory, 'photos' | 'cover_image'>): string[] {
  const urls = (m.photos ?? []).map((p) => p.image_url).filter(Boolean);
  if (urls.length) return urls;
  return m.cover_image ? [m.cover_image] : [];
}
