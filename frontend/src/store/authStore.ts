import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from '@/lib/api/client';
import { ApiError, logError } from '@/lib/api/errors';

/**
 * User type - should match backend
 */
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
  role: string;
  status: string;
  created_at: string;
}

/**
 * Register data type
 */
interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

/**
 * Auth response from API
 */
interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message?: string;
}

/**
 * Auth store state and actions
 */
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * Check authentication status
       */
      checkAuth: () => {
        const token = get().token;
        const user = get().user;
        set({ isAuthenticated: !!(token && user) });
      },

      /**
       * Login with email and password
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<AuthResponse>('/auth/login', { 
            email, 
            password,
          });
          
          if (response.success && response.data) {
            set({
              user: response.data.user,
              token: response.data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error) {
          const errorMessage = error instanceof ApiError 
            ? error.message 
            : 'Erreur lors de la connexion';
          
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
          });
          
          logError(error, 'login');
          throw error;
        }
      },

      /**
       * Register new account
       */
      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<AuthResponse>('/auth/register', data);
          
          if (response.success && response.data) {
            set({
              user: response.data.user,
              token: response.data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error) {
          const errorMessage = error instanceof ApiError 
            ? error.message 
            : 'Erreur lors de l\'inscription';
          
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
          });
          
          logError(error, 'register');
          throw error;
        }
      },

      /**
       * Logout and clear auth state
       */
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      /**
       * Set user data
       */
      setUser: (user: User) => {
        set({ user });
        get().checkAuth();
      },

      /**
       * Clear error message
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);