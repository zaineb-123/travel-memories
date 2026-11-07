'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/lib/api/errors';

/**
 * Admin management hook for common admin operations
 * Handles loading, error states, and success feedback
 */
export function useAdminAction() {
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async <T,>(
    action: () => Promise<T>,
    options: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (data: T) => void;
    } = {}
  ): Promise<T | null> => {
    setIsLoading(true);
    try {
      const result = await action();
      if (options.successMessage) {
        success(options.successMessage);
      }
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof ApiError 
        ? err.message 
        : options.errorMessage || 'Une erreur est survenue';
      error(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [success, error]);

  return { execute, isLoading };
}

/**
 * Admin data loading hook with pagination
 */
export function useAdminData<T>(
  fetcher: (page: number, search: string, filters: Record<string, string>) => Promise<{ items: T[]; total: number; pages: number }>,
  initialSearch = '',
  initialFilters: Record<string, string> = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState(initialFilters);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const { error } = useToast();

  const load = useCallback(async (newPage = 1) => {
    setIsLoading(true);
    try {
      const result = await fetcher(newPage, search, filters);
      setData(result.items);
      setTotal(result.total);
      setPages(result.pages);
      setPage(newPage);
    } catch (err) {
      const errorMsg = err instanceof ApiError ? err.message : 'Erreur de chargement';
      error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [search, filters, fetcher, error]);

  const updateSearch = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  }, []);

  const updateFilters = useCallback((newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  return {
    data,
    setData,
    page,
    pages,
    total,
    isLoading,
    search,
    filters,
    load,
    setPage,
    updateSearch,
    updateFilters,
  };
}

/**
 * Confirmation dialog hook
 */
export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [data, setData] = useState<any>(null);

  const confirm = useCallback((
    title: string,
    description: string,
    item: any,
    onConfirm: (item: any) => Promise<void>
  ) => {
    setData({ title, description, item, onConfirm });
    setOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!data) return;
    setPending(true);
    try {
      await data.onConfirm(data.item);
      setOpen(false);
    } finally {
      setPending(false);
    }
  }, [data]);

  const handleCancel = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    pending,
    data,
    confirm,
    handleConfirm,
    handleCancel,
  };
}
