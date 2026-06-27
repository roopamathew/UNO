export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  avatarColor: string;
  createdAt: string;
}

export interface UserStats {
  userId: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
  totalPoints: number;
  averageScore: number;
  longestWinStreak: number;
  currentWinStreak: number;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  animationsEnabled: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  voiceVolume: number;
  language: string;
  notificationsEnabled: boolean;
  reducedMotion: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}
