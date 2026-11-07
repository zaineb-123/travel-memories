import { apiClient } from './client';

export interface Notification {
  id: number;
  user_id: number;
  from_user_id: number;
  type: 'like' | 'comment' | 'follow';
  reference_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  from_user?: {
    username: string;
    avatar_url: string;
    full_name: string;
  };
}

export const notificationsApi = {
  // Récupérer toutes les notifications
  getAll: async (page = 1): Promise<{ success: boolean; data: Notification[]; pagination: any }> => {
    return apiClient.get(`/notifications?page=${page}`);
  },

  // Récupérer les non lues
  getUnread: async (): Promise<{ success: boolean; data: Notification[]; count: number }> => {
    return apiClient.get('/notifications/unread');
  },

  // Marquer comme lue
  markAsRead: async (notificationId: number): Promise<{ success: boolean }> => {
    return apiClient.put(`/notifications/${notificationId}/read`);
  },

  // Marquer toutes comme lues
  markAllAsRead: async (): Promise<{ success: boolean }> => {
    return apiClient.put('/notifications/read-all');
  },

  // Compter les non lues
  getUnreadCount: async (): Promise<{ success: boolean; data: { count: number } }> => {
    return apiClient.get('/notifications/unread/count');
  },
};