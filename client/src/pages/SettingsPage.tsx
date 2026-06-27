import { useEffect, useRef } from 'react';

import { useQuery, useMutation } from '@tanstack/react-query';

import { useSettingsStore } from '@/stores/settingsStore';

import { useAuthStore } from '@/stores/authStore';

import { userApi } from '@/services/userApi';

import { GlassCard } from '@/components/ui/GlassCard';



function Toggle({

  label,

  description,

  checked,

  onChange,

}: {

  label: string;

  description: string;

  checked: boolean;

  onChange: (v: boolean) => void;

}) {

  return (

    <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 cursor-pointer">

      <div>

        <span className="font-medium block">{label}</span>

        <span className="text-sm text-white/40">{description}</span>

      </div>

      <input

        type="checkbox"

        checked={checked}

        onChange={(e) => onChange(e.target.checked)}

        className="w-5 h-5 rounded accent-uno-red"

      />

    </label>

  );

}



export function SettingsPage() {

  const settings = useSettingsStore();

  const { tokens, isAuthenticated } = useAuthStore();

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hydrated = useRef(false);



  const { data: serverSettings } = useQuery({

    queryKey: ['user-settings'],

    queryFn: () => userApi.getSettings(tokens!.accessToken),

    enabled: isAuthenticated && !!tokens?.accessToken,

  });



  useEffect(() => {

    if (serverSettings && !hydrated.current) {

      settings.updateSettings(serverSettings);

      if (serverSettings.theme) settings.setTheme(serverSettings.theme);

      hydrated.current = true;

    }

  }, [serverSettings]);



  const syncMutation = useMutation({

    mutationFn: (payload: Parameters<typeof userApi.updateSettings>[1]) =>

      userApi.updateSettings(tokens!.accessToken, payload),

  });



  useEffect(() => {

    if (!isAuthenticated || !tokens?.accessToken || !hydrated.current) return;



    if (syncTimer.current) clearTimeout(syncTimer.current);

    syncTimer.current = setTimeout(() => {

      syncMutation.mutate({

        theme: settings.theme,

        animationsEnabled: settings.animationsEnabled,

        soundEnabled: settings.soundEnabled,

        musicEnabled: settings.musicEnabled,

        voiceVolume: settings.voiceVolume,

        language: settings.language,

        notificationsEnabled: settings.notificationsEnabled,

        reducedMotion: settings.reducedMotion,

      });

    }, 600);



    return () => {

      if (syncTimer.current) clearTimeout(syncTimer.current);

    };

  }, [

    settings.theme,

    settings.animationsEnabled,

    settings.soundEnabled,

    settings.musicEnabled,

    settings.voiceVolume,

    settings.language,

    settings.notificationsEnabled,

    settings.reducedMotion,

    isAuthenticated,

    tokens?.accessToken,

  ]);



  return (

    <div className="max-w-2xl mx-auto px-4 py-8">

      <h1 className="text-3xl font-display font-bold mb-8">Settings</h1>



      <div className="space-y-6">

        <GlassCard>

          <h2 className="font-semibold mb-4">Appearance</h2>

          <div className="space-y-2">

            <div className="p-4 rounded-xl bg-white/5">

              <span className="font-medium block mb-2">Theme</span>

              <div className="flex gap-2">

                {(['dark', 'light', 'system'] as const).map((theme) => (

                  <button

                    key={theme}

                    onClick={() => settings.setTheme(theme)}

                    className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${

                      settings.theme === theme

                        ? 'bg-uno-red text-white'

                        : 'bg-white/5 hover:bg-white/10'

                    }`}

                  >

                    {theme}

                  </button>

                ))}

              </div>

            </div>

            <Toggle

              label="Animations"

              description="Enable card and UI animations"

              checked={settings.animationsEnabled}

              onChange={settings.toggleAnimations}

            />

            <Toggle

              label="Reduced Motion"

              description="Minimize animations for accessibility"

              checked={settings.reducedMotion}

              onChange={(v) => settings.updateSettings({ reducedMotion: v })}

            />

          </div>

        </GlassCard>



        <GlassCard>

          <h2 className="font-semibold mb-4">Audio</h2>

          <div className="space-y-2">

            <Toggle

              label="Sound Effects"

              description="Card sounds, button clicks, UNO shout"

              checked={settings.soundEnabled}

              onChange={settings.toggleSound}

            />

            <Toggle

              label="Music"

              description="Background music during gameplay"

              checked={settings.musicEnabled}

              onChange={settings.toggleMusic}

            />

            <div className="p-4 rounded-xl bg-white/5">

              <span className="font-medium block mb-2">Voice Volume</span>

              <input

                type="range"

                min={0}

                max={1}

                step={0.1}

                value={settings.voiceVolume}

                onChange={(e) => settings.setVoiceVolume(parseFloat(e.target.value))}

                className="w-full accent-uno-red"

              />

            </div>

          </div>

        </GlassCard>



        <GlassCard>

          <h2 className="font-semibold mb-4">Notifications</h2>

          <Toggle

            label="Push Notifications"

            description="Get notified about game invites and turns"

            checked={settings.notificationsEnabled}

            onChange={(v) => settings.updateSettings({ notificationsEnabled: v })}

          />

        </GlassCard>



        {isAuthenticated && syncMutation.isPending && (

          <p className="text-xs text-white/30 text-center">Saving...</p>

        )}

      </div>

    </div>

  );

}

