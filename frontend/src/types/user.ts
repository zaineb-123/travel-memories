export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  bio?: string;
  avatar_url: string;
  country?: string;
  city?: string;
  is_private?: boolean;
  memories_count: number;
  followers_count: number;
  following_count: number;
  total_likes_received: number;
  countries_visited: number;
  theme: 'light' | 'dark';
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'inactive' | 'banned';
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message: string;
}