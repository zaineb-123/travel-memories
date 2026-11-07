import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { ApiError, logError, getErrorMessage, getHttpErrorMessage } from './errors';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Centralized API client with proper error handling and type safety
 */
class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(this.handleError(error))
    );

    // Response interceptor - Global error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        return Promise.reject(this.handleResponseError(error));
      }
    );
  }

  /**
   * Safely get token from Zustand storage
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const storage = localStorage.getItem('auth-storage');
      if (!storage) return null;
      
      const parsed = JSON.parse(storage);
      return parsed.state?.token || null;
    } catch (error) {
      logError(error, 'getToken');
      return null;
    }
  }

  /**
   * Get current token
   */
  getCurrentToken(): string | null {
    return this.getToken();
  }

  /**
   * Handle request errors
   */
  private handleError(error: any): ApiError {
    const message = getErrorMessage(error);
    return new ApiError(500, message, error);
  }

  /**
   * Handle response errors with proper status mapping
   */
  private async handleResponseError(error: AxiosError): Promise<ApiError> {
    const status = error.response?.status || 500;
    const data = error.response?.data as { message?: string } | undefined;
    // On privilégie le message précis du serveur ("Titre trop court", "Maximum 20 stories…").
    const message = (typeof data?.message === 'string' && data.message) || getHttpErrorMessage(status);

    logError(error, `API ${status}`);

    // Handle 401 Unauthorized - Token expired or invalid
    if (status === 401 && this.getToken()) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        // Clear auth storage
        try {
          localStorage.removeItem('auth-storage');
        } catch (e) {
          logError(e, 'clearAuth');
        }
        
        // Redirect to login
        window.location.href = '/login';
      }
    }

    return new ApiError(status, message, data);
  }

  /**
   * GET request with proper typing
   */
  async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    try {
      const response = await this.client.get<T>(url, { params });
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.handleError(error);
    }
  }

  /**
   * POST request with proper typing
   */
  async post<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.post<T>(url, data);
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.handleError(error);
    }
  }

  /**
   * PUT request with proper typing
   */
  async put<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.put<T>(url, data);
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.handleError(error);
    }
  }

  /**
   * PATCH request with proper typing
   */
  async patch<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.patch<T>(url, data);
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.handleError(error);
    }
  }

  /**
   * DELETE request with proper typing
   */
  async delete<T = any>(url: string): Promise<T> {
    try {
      const response = await this.client.delete<T>(url);
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.handleError(error);
    }
  }

  /**
   * Upload single file with progress
   */
  async upload<T = any>(
    url: string,
    file: File,
    fieldName = 'file',
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    try {
      const response = await this.client.post<T>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress?.(progress);
          }
        },
      });
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.handleError(error);
    }
  }

  /**
   * POST d'un FormData déjà construit (plusieurs champs + fichier)
   */
  async postForm<T = any>(url: string, formData: FormData): Promise<T> {
    try {
      const response = await this.client.post<T>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.handleError(error);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple<T = any>(
    url: string,
    files: File[],
    fieldName = 'photos[]',
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append(fieldName, file);
    });
    
    try {
      const response = await this.client.post<T>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress?.(progress);
          }
        },
      });
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.handleError(error);
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;