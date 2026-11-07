import { apiClient } from './client';
import type { Story, StoryGroup, PublicUser } from '@/types/social';

type R<T> = { success: boolean; data: T };

export const storiesApi = {
  feed: () => apiClient.get<R<StoryGroup[]>>('/stories'),
  forMap: () => apiClient.get<R<Story[]>>('/stories/map'),
  byUser: (username: string) => apiClient.get<R<Story[]>>(`/stories/user/${username}`),
  markViewed: (id: number) => apiClient.post<R<undefined>>(`/stories/${id}/view`),
  viewers: (id: number) => apiClient.get<R<(PublicUser & { viewed_at: string })[]>>(`/stories/${id}/viewers`),
  remove: (id: number) => apiClient.delete<R<undefined>>(`/stories/${id}`),
  create: (form: FormData) => apiClient.postForm<R<Story>>('/stories', form),
};
