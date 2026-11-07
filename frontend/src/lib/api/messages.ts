import { apiClient } from './client';
import type { ChatMessage, Conversation } from '@/types/social';

type R<T> = { success: boolean; data: T };

export const messagesApi = {
  conversations: () => apiClient.get<R<Conversation[]>>('/conversations', { limit: 50 }),
  open: (userId: number) => apiClient.post<R<{ id: number }>>('/conversations', { user_id: userId }),
  messages: (conversationId: number, before?: number) =>
    apiClient.get<R<ChatMessage[]> & { has_more: boolean; user: Conversation['user'] }>(
      `/conversations/${conversationId}/messages`,
      before ? { before } : undefined,
    ),
  send: (conversationId: number, payload: { body?: string; memory_id?: number }) =>
    apiClient.post<R<ChatMessage>>(`/conversations/${conversationId}/messages`, payload),
  markRead: (conversationId: number) => apiClient.put<R<{ count: number }>>(`/conversations/${conversationId}/read`),
  remove: (conversationId: number, messageId: number) =>
    apiClient.delete<R<undefined>>(`/conversations/${conversationId}/messages/${messageId}`),
  unreadCount: () => apiClient.get<R<{ count: number }>>('/conversations/unread/count'),

  /** Partager un souvenir à un ou plusieurs amis (messages privés). */
  shareMemory: (memoryId: number, userIds: number[], body?: string) =>
    apiClient.post<R<{ sent: number[]; failed: { user_id: number; reason: string }[]; share_url: string }>>(
      `/memories/${memoryId}/share`,
      { user_ids: userIds, ...(body ? { body } : {}) },
    ),
};
