import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TurnTimerProps {
  turnStartedAt: string;
  turnTimerSeconds: number;
  isMyTurn: boolean;
}

export function TurnTimer({ turnStartedAt, turnTimerSeconds, isMyTurn }: TurnTimerProps) {
  const [remaining, setRemaining] = useState(turnTimerSeconds);

  useEffect(() => {
    if (turnTimerSeconds <= 0) return;

    const tick = () => {
      const elapsed = (Date.now() - new Date(turnStartedAt).getTime()) / 1000;
      setRemaining(Math.max(0, Math.ceil(turnTimerSeconds - elapsed)));
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [turnStartedAt, turnTimerSeconds]);

  if (turnTimerSeconds <= 0) return null;

  const urgent = remaining <= 5;
  const pct = (remaining / turnTimerSeconds) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${urgent ? 'bg-uno-red' : isMyTurn ? 'bg-uno-yellow' : 'bg-uno-blue'}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>
      <span className={`text-xs font-mono tabular-nums ${urgent ? 'text-uno-red animate-pulse' : 'text-white/50'}`}>
        {remaining}s
      </span>
    </div>
  );
}
