import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, AuthTokens } from '@uno/shared';
import { authApi } from '../services/authApi';

interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setUser: (user: UserProfile) => void;
  setTokens: (user: UserProfile, tokens: AuthTokens) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authApi.login({ email, password });
          set({
            user: result.user,
            tokens: result.tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Login failed',
            isLoading: false,
          });
          throw err;
        }
      },

      register: async (email, username, password) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authApi.register({ email, username, password });
          set({
            user: result.user,
            tokens: result.tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Registration failed',
            isLoading: false,
          });
          throw err;
        }
      },

      logout: async () => {
        const { tokens } = get();
        if (tokens?.refreshToken) {
          try {
            await authApi.logout(tokens.refreshToken);
          } catch {
            // Ignore logout errors
          }
        }
        set({ user: null, tokens: null, isAuthenticated: false });
      },

      refreshAuth: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) return;

        try {
          const result = await authApi.refresh(tokens.refreshToken);
          set({
            user: result.user,
            tokens: result.tokens,
            isAuthenticated: true,
          });
        } catch {
          set({ user: null, tokens: null, isAuthenticated: false });
        }
      },

      setUser: (user) => set({ user }),
      setTokens: (user, tokens) =>
        set({ user, tokens, isAuthenticated: true, isLoading: false, error: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'uno-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
