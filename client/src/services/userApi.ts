import { api } from './api';
import type { UserSettings } from '@uno/shared';

export const userApi = {
  getStats: (token: string) => api.get<unknown>('/api/users/stats', token),

  getSettings: (token: string) => api.get<UserSettings | null>('/api/users/settings', token),

  updateSettings: (token: string, settings: Partial<UserSettings>) =>
    api.patch<UserSettings>('/api/users/settings', settings, token),

  getLeaderboard: (period: string, limit = 50) =>
    api.get<{ period: string; entries: LeaderboardEntry[] }>(
      `/api/users/leaderboard?period=${period}&limit=${limit}`,
    ),
};

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarColor: string;
  wins: number;
  totalPoints: number;
  gamesPlayed: number;
  winRate: number;
  pointsToNext?: number;
}
