import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings } from '@uno/shared';

interface SettingsState extends UserSettings {
  setTheme: (theme: UserSettings['theme']) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleAnimations: () => void;
  setVoiceVolume: (volume: number) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  animationsEnabled: true,
  soundEnabled: true,
  musicEnabled: true,
  voiceVolume: 0.8,
  language: 'en',
  notificationsEnabled: true,
  reducedMotion: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark' || theme === 'system');
        set({ theme });
      },

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
      toggleAnimations: () => set((s) => ({ animationsEnabled: !s.animationsEnabled })),
      setVoiceVolume: (voiceVolume) => set({ voiceVolume }),

      updateSettings: (settings) => set((s) => ({ ...s, ...settings })),
    }),
    { name: 'uno-settings' },
  ),
);
