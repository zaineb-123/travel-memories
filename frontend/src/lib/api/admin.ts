import { apiClient } from './client';
import { AdminStats, AdminUser, AdminMemory, Report, ActivityLog, ApiResponse } from '@/types/admin';

export const adminApi = {
  // Dashboard
  getStats: async (): Promise<ApiResponse<AdminStats>> => {
    return apiClient.get('/admin/stats');
  },

  getActivityLogs: async (page = 1, limit = 20): Promise<ApiResponse<{ logs: ActivityLog[]; pagination: any }>> => {
    return apiClient.get(`/admin/activities?page=${page}&limit=${limit}`);
  },

  // Users Management
  getUsers: async (page = 1, search = '', status = ''): Promise<ApiResponse<{ users: AdminUser[]; pagination: any }>> => {
    return apiClient.get(`/admin/users?page=${page}&search=${search}&status=${status}`);
  },

  getUserById: async (id: number): Promise<ApiResponse<AdminUser>> => {
    return apiClient.get(`/admin/users/${id}`);
  },

  updateUserRole: async (id: number, role: string): Promise<ApiResponse<AdminUser>> => {
    return apiClient.patch(`/admin/users/${id}/role`, { role });
  },

  updateUserStatus: async (id: number, status: string): Promise<ApiResponse<AdminUser>> => {
    return apiClient.patch(`/admin/users/${id}/status`, { status });
  },

  deleteUser: async (id: number): Promise<ApiResponse<null>> => {
    return apiClient.delete(`/admin/users/${id}`);
  },

  banUser: async (id: number, reason: string): Promise<ApiResponse<null>> => {
    return apiClient.post(`/admin/users/${id}/ban`, { reason });
  },

  unbanUser: async (id: number): Promise<ApiResponse<null>> => {
    return apiClient.post(`/admin/users/${id}/unban`);
  },

  // Memories Management
  getMemories: async (page = 1, search = '', status = '', visibility = ''): Promise<ApiResponse<{ memories: AdminMemory[]; pagination: any }>> => {
    return apiClient.get(`/admin/memories?page=${page}&search=${search}&status=${status}&visibility=${visibility}`);
  },

  getMemoryById: async (id: number): Promise<ApiResponse<AdminMemory>> => {
    return apiClient.get(`/admin/memories/${id}`);
  },

  updateMemoryStatus: async (id: number, status: string): Promise<ApiResponse<AdminMemory>> => {
    return apiClient.patch(`/admin/memories/${id}/status`, { status });
  },

  featureMemory: async (id: number, featured: boolean): Promise<ApiResponse<AdminMemory>> => {
    return apiClient.patch(`/admin/memories/${id}/feature`, { featured });
  },

  deleteMemory: async (id: number): Promise<ApiResponse<null>> => {
    return apiClient.delete(`/admin/memories/${id}`);
  },

  // Reports Management
  getReports: async (page = 1, status = ''): Promise<ApiResponse<{ reports: Report[]; pagination: any }>> => {
    return apiClient.get(`/admin/reports?page=${page}&status=${status}`);
  },

  updateReportStatus: async (id: number, status: string, action?: string): Promise<ApiResponse<Report>> => {
    return apiClient.patch(`/admin/reports/${id}`, { status, action });
  },

  // Settings
  getSettings: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/admin/settings');
  },

  updateSettings: async (settings: any): Promise<ApiResponse<any>> => {
    return apiClient.put('/admin/settings', settings);
  },
};