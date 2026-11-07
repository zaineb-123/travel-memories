export interface AdminStats {
  total_users: number;
  total_memories: number;
  total_likes: number;
  total_comments: number;
  total_follows: number;
  new_users_today: number;
  new_memories_today: number;
  active_users: number;
  banned_users: number;
  pending_reports: number;
  storage_used: number;
  storage_limit: number;
  growth: {
    users: number;
    memories: number;
    engagement: number;
  };
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'banned' | 'inactive';
  memories_count: number;
  followers_count: number;
  following_count: number;
  total_likes_received: number;
  created_at: string;
  last_login: string | null;
  email_verified: boolean;
}

export interface AdminMemory {
  id: number;
  title: string;
  description: string;
  user_id: number;
  username: string;
  full_name: string;
  avatar_url: string;
  country: string;
  city: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  visibility: 'public' | 'private' | 'followers';
  status: 'published' | 'draft' | 'reported' | 'deleted';
  created_at: string;
  cover_image: string;
  is_featured: boolean;
}

export interface Report {
  id: number;
  reporter_id: number;
  reporter_name: string;
  target_type: 'memory' | 'user' | 'comment';
  target_id: number;
  target_title: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  target_type: string;
  target_id: number;
  ip_address: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}