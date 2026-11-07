import type { Memory } from './memory';

export type FollowStatus = 'none' | 'following' | 'requested';

export interface PublicUser {
  id: number;
  username: string;
  full_name: string;
  avatar_url: string;
  bio?: string;
  is_private?: boolean;
  followers_count?: number;
  following_count?: number;
  memories_count?: number;
}

export interface Story {
  id: number;
  user_id: number;
  image_url: string;
  caption: string | null;
  country: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  visibility: 'public' | 'followers';
  created_at: string;
  expires_at: string;
  seen: boolean;
  views_count: number | null;
  user: { id: number; username: string; full_name: string; avatar_url: string };
}

export interface StoryGroup {
  user: Story['user'];
  stories: Story[];
  has_unseen: boolean;
}

export interface Conversation {
  id: number;
  user: { id: number; username: string; full_name: string; avatar_url: string };
  last_message: { sender_id: number; is_mine: boolean; preview: string; created_at: string };
  unread_count: number;
  last_message_at: string;
}

export interface SharedMemory {
  id?: number;
  title?: string;
  country?: string;
  city?: string | null;
  cover_image?: string;
  user?: { username: string; avatar_url: string };
  unavailable?: boolean;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  is_mine: boolean;
  body: string | null;
  deleted: boolean;
  memory: SharedMemory | null;
  created_at: string;
  read_at: string | null;
}

export type { Memory };
