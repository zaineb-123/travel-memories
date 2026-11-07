import { apiClient } from './client';
import { LoginInput, RegisterInput } from '@/lib/validations';

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      username: string;
      email: string;
      full_name: string;
      avatar_url: string;
      role: string;
      status: string;
    };
    token: string;
  };
  message: string;
}

export const authApi = {
  login: async (credentials: LoginInput): Promise<AuthResponse> => {
    return apiClient.post('/auth/login', credentials);
  },

  register: async (data: RegisterInput): Promise<AuthResponse> => {
    return apiClient.post('/auth/register', data);
  },

  logout: async (): Promise<{ success: boolean }> => {
    return apiClient.post('/auth/logout');
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string): Promise<{ success: boolean }> => {
    return apiClient.post('/auth/reset-password', { token, password });
  },
};