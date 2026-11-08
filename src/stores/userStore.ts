import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  userId: string | null;
  username: string | null;
  avatarUrl: string | null;
  setUser: (userId: string, username: string, avatarUrl?: string) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: null,
      username: null,
      avatarUrl: null,
      setUser: (userId, username, avatarUrl) => set({ userId, username, avatarUrl }),
      clearUser: () => set({ userId: null, username: null, avatarUrl: null }),
    }),
    {
      name: 'user-storage',
    }
  )
);
