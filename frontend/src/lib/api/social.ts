import { apiClient } from './client';
import type { FollowStatus, PublicUser } from '@/types/social';

type R<T> = { success: boolean; data: T; message?: string };

export const socialApi = {
  /** Suivre : renvoie "following" (compte public) ou "requested" (compte privé). */
  follow: (userId: number) => apiClient.post<R<{ status: FollowStatus }>>(`/users/${userId}/follow`),
  /** Se désabonner OU annuler une demande en attente. */
  unfollow: (userId: number) => apiClient.delete<R<{ status: FollowStatus }>>(`/users/${userId}/follow`),
  removeFollower: (userId: number) => apiClient.delete<R<undefined>>(`/users/${userId}/follower`),

  followers: (username: string, page = 1) => apiClient.get<R<PublicUser[]>>(`/users/${username}/followers`, { page }),
  following: (username: string, page = 1) => apiClient.get<R<PublicUser[]>>(`/users/${username}/following`, { page }),

  requests: () => apiClient.get<R<PublicUser[]> & { count: number }>('/follow-requests'),
  acceptRequest: (userId: number) => apiClient.post<R<undefined>>(`/follow-requests/${userId}/accept`),
  declineRequest: (userId: number) => apiClient.delete<R<undefined>>(`/follow-requests/${userId}`),

  friends: (q?: string) => apiClient.get<R<PublicUser[]>>('/friends', q ? { q, limit: 50 } : { limit: 50 }),

  blocks: () => apiClient.get<R<PublicUser[]>>('/blocks'),
  block: (userId: number) => apiClient.post<R<undefined>>(`/blocks/${userId}`),
  unblock: (userId: number) => apiClient.delete<R<undefined>>(`/blocks/${userId}`),

  searchUsers: (q: string) => apiClient.get<R<PublicUser[]>>('/users/search', { q }),
  tagged: (username: string, page = 1) => apiClient.get<R<any[]>>(`/users/${username}/tagged`, { page }),

  setPrivate: (is_private: boolean) => apiClient.put<R<any>>('/users/me', { is_private }),
};
