import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  email: string;
  chips: number;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  updateChips: (chips: number) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
      updateChips: (chips) => set((s) => s.user ? { user: { ...s.user, chips } } : {}),
    }),
    {
      name: 'poker-auth-storage',
    }
  )
);
