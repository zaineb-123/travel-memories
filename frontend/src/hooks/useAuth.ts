'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Auth hook with proper redirect handling
 * Eliminates race conditions and infinite loops
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading, login, register, logout } = useAuthStore();
  const router = useRouter();

  /**
   * Redirect to login if not authenticated
   */
  const requireAuth = useCallback((redirectTo = '/login') => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
    
    return { isAuthenticated, isLoading, user };
  }, [isLoading, isAuthenticated, router, user]);

  /**
   * Redirect to dashboard if already authenticated
   */
  const requireGuest = useCallback((redirectTo = '/my-map') => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
    
    return { isAuthenticated, isLoading, user };
  }, [isLoading, isAuthenticated, router, user]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    requireAuth,
    requireGuest,
  };
}
