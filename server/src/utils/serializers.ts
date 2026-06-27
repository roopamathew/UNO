import type { User } from '@prisma/client';
import type { UserProfile, UserSettings } from '@uno/shared';

export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    avatarColor: user.avatarColor,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toDefaultSettings(userId: string) {
  return {
    userId,
    theme: 'dark' as const,
    animationsEnabled: true,
    soundEnabled: true,
    musicEnabled: true,
    voiceVolume: 0.8,
    language: 'en',
    notificationsEnabled: true,
    reducedMotion: false,
  };
}

export function formatUserSettings(settings: {
  theme: string;
  animationsEnabled: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  voiceVolume: number;
  language: string;
  notificationsEnabled: boolean;
  reducedMotion: boolean;
}): UserSettings {
  return {
    theme: settings.theme as UserSettings['theme'],
    animationsEnabled: settings.animationsEnabled,
    soundEnabled: settings.soundEnabled,
    musicEnabled: settings.musicEnabled,
    voiceVolume: settings.voiceVolume,
    language: settings.language,
    notificationsEnabled: settings.notificationsEnabled,
    reducedMotion: settings.reducedMotion,
  };
}
