import { useCallback, useRef } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

type SoundName =
  | 'cardPlay'
  | 'cardDraw'
  | 'button'
  | 'uno'
  | 'victory'
  | 'countdown';

const SOUND_FREQ: Record<SoundName, number> = {
  cardPlay: 440,
  cardDraw: 330,
  button: 520,
  uno: 660,
  victory: 880,
  countdown: 392,
};

export function useSound() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const play = useCallback(
    (name: SoundName) => {
      if (!soundEnabled) return;

      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = SOUND_FREQ[name];
        osc.type = name === 'victory' ? 'triangle' : 'sine';

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } catch {
        // Audio not available
      }
    },
    [soundEnabled],
  );

  return { play };
}
