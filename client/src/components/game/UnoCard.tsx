import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { Card, CardColor } from '@uno/shared';

const COLOR_MAP: Record<Exclude<CardColor, 'wild'>, { bg: string; text: string; oval: string }> = {
  red: { bg: '#E53935', text: '#fff', oval: '#FFCDD2' },
  blue: { bg: '#1E88E5', text: '#fff', oval: '#BBDEFB' },
  green: { bg: '#43A047', text: '#fff', oval: '#C8E6C9' },
  yellow: { bg: '#FDD835', text: '#333', oval: '#FFF9C4' },
};

function cardLabel(value: Card['value']): string {
  switch (value) {
    case 'skip':
      return '⊘';
    case 'reverse':
      return '⇄';
    case 'draw2':
      return '+2';
    case 'wild':
      return 'W';
    case 'wild4':
      return '+4';
    default:
      return value;
  }
}

interface UnoCardProps {
  card: Card;
  wildColor?: CardColor | null;
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  selected?: boolean;
  playable?: boolean;
  onClick?: () => void;
  layoutId?: string;
}

export function UnoCard({
  card,
  wildColor,
  size = 'md',
  faceDown = false,
  selected = false,
  playable = false,
  onClick,
  layoutId,
}: UnoCardProps) {
  const sizes = {
    sm: 'w-14 h-20 text-xs',
    md: 'w-20 h-28 text-sm',
    lg: 'w-24 h-36 text-base',
  };

  if (faceDown) {
    return (
      <motion.div
        layoutId={layoutId}
        className={clsx(
          sizes[size],
          'rounded-xl bg-gradient-to-br from-gray-800 to-black border-2 border-white/20 shadow-lg flex items-center justify-center',
        )}
      >
        <div className="w-3/4 h-3/4 rounded-lg border border-uno-red/50 bg-uno-red/20" />
      </motion.div>
    );
  }

  const isWild = card.color === 'wild';
  const displayColor = isWild ? (wildColor && wildColor !== 'wild' ? wildColor : 'red') : card.color;
  const colors = COLOR_MAP[displayColor as Exclude<CardColor, 'wild'>];
  const label = cardLabel(card.value);

  return (
    <motion.button
      type="button"
      layoutId={layoutId}
      onClick={onClick}
      disabled={!onClick}
      whileHover={onClick ? { y: -12, scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      className={clsx(
        sizes[size],
        'rounded-xl border-2 shadow-xl relative overflow-hidden transition-shadow',
        onClick && 'cursor-pointer',
        selected && 'ring-4 ring-white ring-offset-2 ring-offset-uno-darker',
        playable && 'ring-2 ring-green-400/60',
        !playable && onClick && 'opacity-90',
      )}
      style={{ backgroundColor: isWild ? '#1a1a2e' : colors.bg, borderColor: 'rgba(255,255,255,0.3)' }}
    >
      {isWild && (
        <div className="absolute inset-0 flex">
          {(['red', 'blue', 'green', 'yellow'] as const).map((c) => (
            <div key={c} className="flex-1" style={{ backgroundColor: COLOR_MAP[c].bg, opacity: 0.85 }} />
          ))}
        </div>
      )}

      <span
        className="absolute top-1 left-1.5 font-bold font-display"
        style={{ color: isWild ? '#fff' : colors.text, fontSize: size === 'sm' ? '0.65rem' : '0.75rem' }}
      >
        {label}
      </span>
      <span
        className="absolute bottom-1 right-1.5 font-bold font-display rotate-180"
        style={{ color: isWild ? '#fff' : colors.text, fontSize: size === 'sm' ? '0.65rem' : '0.75rem' }}
      >
        {label}
      </span>

      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="w-[70%] h-[55%] rounded-[50%] flex items-center justify-center font-display font-black border-2 border-white/30"
          style={{
            backgroundColor: isWild ? 'rgba(255,255,255,0.15)' : colors.oval,
            color: isWild ? '#fff' : colors.bg,
            fontSize: size === 'lg' ? '1.5rem' : size === 'md' ? '1.1rem' : '0.9rem',
          }}
        >
          {label}
        </div>
      </div>
    </motion.button>
  );
}

interface ColorPickerProps {
  onSelect: (color: CardColor) => void;
}

export function ColorPicker({ onSelect }: ColorPickerProps) {
  const colors: Exclude<CardColor, 'wild'>[] = ['red', 'blue', 'green', 'yellow'];

  return (
    <div className="flex gap-3 justify-center">
      {colors.map((color) => (
        <motion.button
          key={color}
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onSelect(color)}
          className="w-14 h-14 rounded-full border-4 border-white/40 shadow-lg capitalize font-semibold text-white text-xs"
          style={{ backgroundColor: COLOR_MAP[color].bg }}
        >
          {color}
        </motion.button>
      ))}
    </div>
  );
}

export { COLOR_MAP };
