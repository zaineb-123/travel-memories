import { create } from 'zustand';
import { Memory } from '@/types';
import { MemoryInput } from '@/lib/validations';
import { memoriesApi } from '@/lib/api/memories';

interface MemoryState {
  memories: Memory[];
  selectedMemory: Memory | null;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  
  loadMemories: (reset?: boolean) => Promise<void>;
  loadMemoryById: (id: number) => Promise<void>;
  createMemory: (data: MemoryInput) => Promise<Memory>;
  updateMemory: (id: number, data: Partial<MemoryInput>) => Promise<void>;
  deleteMemory: (id: number) => Promise<void>;
  likeMemory: (id: number) => Promise<void>;
  unlikeMemory: (id: number) => Promise<void>;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  selectedMemory: null,
  isLoading: false,
  hasMore: true,
  page: 1,

  loadMemories: async (reset = false) => {
    const currentPage = reset ? 1 : get().page;
    
    if (get().isLoading) return;
    
    set({ isLoading: true });
    
    try {
      const response = await memoriesApi.getAll(currentPage, 12);
      
      if (response.success) {
        const { memories, pagination } = response.data;
        
        set((state) => ({
          memories: reset ? memories : [...state.memories, ...memories],
          page: currentPage + 1,
          hasMore: pagination.hasMore,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error loading memories:', error);
      set({ isLoading: false });
    }
  },

  loadMemoryById: async (id: number) => {
    set({ isLoading: true });
    try {
      const response = await memoriesApi.getById(id);
      if (response.success) {
        set({ selectedMemory: response.data, isLoading: false });
      }
    } catch (error) {
      console.error('Error loading memory:', error);
      set({ isLoading: false });
    }
  },

  createMemory: async (data: MemoryInput) => {
    set({ isLoading: true });
    try {
      const response = await memoriesApi.create(data);
      if (response.success) {
        const newMemory = response.data;
        set((state) => ({
          memories: [newMemory, ...state.memories],
          isLoading: false,
        }));
        return newMemory;
      }
      throw new Error('Failed to create memory');
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateMemory: async (id: number, data: Partial<MemoryInput>) => {
    try {
      const response = await memoriesApi.update(id, data);
      if (response.success) {
        set((state) => ({
          memories: state.memories.map((m) => (m.id === id ? response.data : m)),
          selectedMemory: response.data,
        }));
      }
    } catch (error) {
      console.error('Error updating memory:', error);
      throw error;
    }
  },

  deleteMemory: async (id: number) => {
    try {
      await memoriesApi.delete(id);
      set((state) => ({
        memories: state.memories.filter((m) => m.id !== id),
        selectedMemory: null,
      }));
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  },

  likeMemory: async (id: number) => {
    try {
      const response = await memoriesApi.like(id);
      if (response.success) {
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id ? { ...m, likes_count: response.data.likes_count, is_liked: true } : m
          ),
          selectedMemory: state.selectedMemory?.id === id 
            ? { ...state.selectedMemory, likes_count: response.data.likes_count, is_liked: true }
            : state.selectedMemory,
        }));
      }
    } catch (error) {
      console.error('Error liking memory:', error);
    }
  },

  unlikeMemory: async (id: number) => {
    try {
      const response = await memoriesApi.unlike(id);
      if (response.success) {
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id ? { ...m, likes_count: response.data.likes_count, is_liked: false } : m
          ),
          selectedMemory: state.selectedMemory?.id === id 
            ? { ...state.selectedMemory, likes_count: response.data.likes_count, is_liked: false }
            : state.selectedMemory,
        }));
      }
    } catch (error) {
      console.error('Error unliking memory:', error);
    }
  },
}));