import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { UnoCard, ColorPicker } from '@/components/game/UnoCard';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import type { GameMovePayload, GameState, CardColor } from '@uno/shared';
import { cardMatches, DEFAULT_HOUSE_RULES } from '@uno/shared';
import { useSound } from '@/hooks/useSound';

export function AIGamePage() {
  const { tokens, isAuthenticated } = useAuthStore();
  const { play } = useSound();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pendingWild, setPendingWild] = useState<string | null>(null);

  const startMutation = useMutation({
    mutationFn: () =>
      api.post<{ sessionId: string; state: GameState }>('/api/ai/start', {}, tokens?.accessToken),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setGameState(data.state);
      play('button');
    },
  });

  const moveMutation = useMutation({
    mutationFn: (move: GameMovePayload) =>
      api.post<{ state: GameState }>(`/api/ai/${sessionId}/move`, move, tokens?.accessToken),
    onSuccess: (data) => {
      setGameState(data.state);
      play('cardPlay');
    },
  });

  const myPlayer = gameState?.players.find((p) => p.playerId === 'human');
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.playerId === 'human';

  const playableIds = new Set(
    myPlayer?.hand
      ?.filter((c) =>
        cardMatches(c, gameState!.discardTop, gameState!.wildColor, gameState!.pendingDraw, DEFAULT_HOUSE_RULES),
      )
      .map((c) => c.id) ?? [],
  );

  const handlePlay = (cardId: string, color?: CardColor) => {
    const card = myPlayer?.hand?.find((c) => c.id === cardId);
    if (card?.color === 'wild' && !color) {
      setPendingWild(cardId);
      return;
    }
    moveMutation.mutate({ type: 'play', cardId, chosenColor: color });
    setPendingWild(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <GlassCard className="text-center max-w-md">
          <h1 className="text-2xl font-display font-bold mb-4">AI Game</h1>
          <p className="text-white/50 mb-6">Sign in to play against the UNO Bot</p>
          <Link to="/login"><Button>Sign In</Button></Link>
        </GlassCard>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <GlassCard className="text-center max-w-lg">
          <span className="text-6xl mb-4 block">🤖</span>
          <h1 className="text-3xl font-display font-bold mb-4">AI Opponent</h1>
          <p className="text-white/50 mb-8">
            Challenge an intelligent bot powered by OpenAI. Falls back to strategic heuristics
            when no API key is configured.
          </p>
          <Button onClick={() => startMutation.mutate()} isLoading={startMutation.isPending}>
            Start AI Game
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display font-bold text-xl">vs UNO Bot</h1>
        <p className="text-white/40 text-sm">{currentPlayer?.username}&apos;s turn</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="flex items-center gap-12">
          <UnoCard card={{ id: 'b', color: 'wild', value: '0' }} faceDown size="md" />
          <UnoCard card={gameState.discardTop} wildColor={gameState.wildColor} size="lg" />
        </div>

        {gameState.lastAction && (
          <motion.p
            key={gameState.lastAction.timestamp}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/50 text-sm italic"
          >
            {gameState.lastAction.message}
          </motion.p>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {myPlayer?.hand?.map((card) => (
            <UnoCard
              key={card.id}
              card={card}
              playable={playableIds.has(card.id)}
              onClick={isMyTurn ? () => handlePlay(card.id) : undefined}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {isMyTurn && (
            <Button onClick={() => moveMutation.mutate({ type: 'draw' })} variant="secondary">
              Draw
            </Button>
          )}
          {myPlayer?.handCount === 1 && (
            <Button onClick={() => moveMutation.mutate({ type: 'call_uno' })}>UNO!</Button>
          )}
        </div>
      </div>

      {(pendingWild || gameState.phase === 'choosing_color') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <GlassCard>
            <h3 className="font-bold mb-4 text-center">Choose Color</h3>
            <ColorPicker onSelect={(c) => {
              if (pendingWild) handlePlay(pendingWild, c);
              else moveMutation.mutate({ type: 'choose_color', chosenColor: c });
            }} />
          </GlassCard>
        </div>
      )}

      {gameState.phase === 'game_over' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <GlassCard className="text-center">
            <h2 className="text-3xl font-display font-bold text-gradient mb-4">
              {gameState.winnerId === 'human' ? 'You Win!' : 'Bot Wins!'}
            </h2>
            <Button onClick={() => { setGameState(null); setSessionId(null); }}>Play Again</Button>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
