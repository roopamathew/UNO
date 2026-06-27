import { useEffect, useMemo, useRef } from 'react';

import { useParams, useNavigate } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';

import { UnoCard, ColorPicker } from '@/components/game/UnoCard';

import { TurnTimer } from '@/components/game/TurnTimer';

import { VoicePanel } from '@/components/voice/VoicePanel';

import { Button } from '@/components/ui/Button';

import { GlassCard } from '@/components/ui/GlassCard';

import { useGameStore } from '@/stores/gameStore';

import { useLobbyStore } from '@/stores/lobbyStore';

import { useAuthStore } from '@/stores/authStore';

import { getSocket } from '@/services/socketService';

import { useSound } from '@/hooks/useSound';

import { cardMatches, DEFAULT_HOUSE_RULES } from '@uno/shared';

import type { CardColor } from '@uno/shared';



export function GamePage() {

  const { roomId } = useParams<{ roomId: string }>();

  const navigate = useNavigate();

  const { user } = useAuthStore();

  const { room, joinRoom } = useLobbyStore();

  const { tokens } = useAuthStore();

  const { play } = useSound();

  const lastActionRef = useRef<string | null>(null);

  const {

    gameState,

    myPlayerId,

    error,

    isMyTurn,

    pendingWildCardId,

    drawCard,

    playCard,

    callUno,

    catchUno,

    chooseColor,

    nextRound,

    requestSync,

    clearError,

    clearGame,

  } = useGameStore();



  useEffect(() => {

    if (roomId && !room) {

      joinRoom(roomId, tokens?.accessToken);

    }

  }, [roomId, room]);



  useEffect(() => {

    if (room && user) {

      const me = room.players.find((p) => p.userId === user.id);

      if (me) {

        useGameStore.getState().setMyPlayerId(me.id);

      }

    }

  }, [room, user]);



  useEffect(() => {

    requestSync();

  }, [roomId]);



  useEffect(() => {

    const socket = getSocket();

    if (!socket) return;



    const onStarted = ({ roomId: startedRoomId }: { gameId: string; roomId: string }) => {

      if (startedRoomId === roomId) requestSync();

    };



    socket.on('game:started', onStarted);

    return () => {

      socket.off('game:started', onStarted);

    };

  }, [roomId]);



  useEffect(() => {

    const actionKey = gameState?.lastAction?.timestamp ?? null;

    if (!actionKey || actionKey === lastActionRef.current) return;

    lastActionRef.current = actionKey;



    const type = gameState?.lastAction?.type;

    if (type === 'play' || type === 'draw') play('cardPlay');

    else if (type === 'uno') play('uno');

    else if (gameState?.phase === 'game_over') play('victory');

  }, [gameState?.lastAction, gameState?.phase, play]);



  const houseRules = gameState?.houseRules ?? room?.houseRules ?? DEFAULT_HOUSE_RULES;

  const myPlayer = gameState?.players.find((p) => p.playerId === myPlayerId);

  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];



  const playableIds = useMemo(() => {

    if (!gameState || !myPlayer?.hand || !isMyTurn) return new Set<string>();

    const top = gameState.discardTop;

    return new Set(

      myPlayer.hand

        .filter((c) =>

          cardMatches(c, top, gameState.wildColor, gameState.pendingDraw, houseRules),

        )

        .map((c) => c.id),

    );

  }, [gameState, myPlayer, isMyTurn, houseRules]);



  const showColorPicker =

    pendingWildCardId !== null ||

    (gameState?.phase === 'choosing_color' && isMyTurn);



  const handleDraw = () => {

    play('cardDraw');

    drawCard();

  };



  const handlePlay = (cardId: string) => {

    play('cardPlay');

    playCard(cardId);

  };



  const handleCallUno = () => {

    play('uno');

    callUno();

  };



  if (!gameState) {

    return (

      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">

        <div className="text-center">

          <div className="w-10 h-10 border-2 border-uno-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-white/50">Loading game...</p>

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-[calc(100vh-4rem)] flex flex-col relative overflow-hidden">

      <div className="absolute inset-0 bg-gradient-to-b from-uno-darker via-[#0f172a] to-uno-darker -z-10" />



      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 gap-4">

        <div>

          <h1 className="font-display font-bold text-lg">Round {gameState.roundNumber}</h1>

          <p className="text-white/40 text-sm">

            {currentPlayer?.username}&apos;s turn

            {gameState.direction === 1 ? ' →' : ' ←'}

          </p>

        </div>



        <TurnTimer

          turnStartedAt={gameState.turnStartedAt}

          turnTimerSeconds={gameState.turnTimerSeconds}

          isMyTurn={isMyTurn}

        />



        <div className="flex gap-2">

          {gameState.players.map((p) => (

            <div key={p.playerId} className="text-center">

              <div

                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${

                  p.playerId === currentPlayer?.playerId ? 'ring-2 ring-uno-yellow' : ''

                }`}

                style={{ backgroundColor: p.avatarColor }}

              >

                {p.handCount}

              </div>

              <span className="text-[10px] text-white/40 truncate max-w-[48px] block">

                {p.username}

              </span>

            </div>

          ))}

        </div>

        <Button variant="ghost" size="sm" onClick={() => { clearGame(); navigate(`/lobby/${roomId}`); }}>

          Lobby

        </Button>

      </div>



      {error && (

        <div className="mx-4 mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex justify-between">

          <span>{error}</span>

          <button onClick={clearError}>✕</button>

        </div>

      )}



      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-6">

        <div className="flex items-center gap-12">

          <motion.button

            type="button"

            whileHover={isMyTurn ? { scale: 1.05 } : undefined}

            onClick={isMyTurn ? handleDraw : undefined}

            className="relative"

            disabled={!isMyTurn}

          >

            <UnoCard

              card={{ id: 'back', color: 'wild', value: '0' }}

              faceDown

              size="md"

            />

            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/40 whitespace-nowrap">

              Draw ({gameState.drawPileCount})

            </span>

          </motion.button>



          <div className="relative">

            <UnoCard card={gameState.discardTop} wildColor={gameState.wildColor} size="lg" />

            {gameState.pendingDraw > 0 && (

              <motion.span

                initial={{ scale: 0 }}

                animate={{ scale: 1 }}

                className="absolute -top-3 -right-3 bg-uno-red text-white text-xs font-bold px-2 py-1 rounded-full"

              >

                +{gameState.pendingDraw}

              </motion.span>

            )}

          </div>

        </div>



        {gameState.lastAction && (

          <motion.p

            key={gameState.lastAction.timestamp}

            initial={{ opacity: 0, y: 10 }}

            animate={{ opacity: 1, y: 0 }}

            className="text-white/50 text-sm italic"

          >

            {gameState.lastAction.message}

          </motion.p>

        )}



        <div className="w-full max-w-4xl">

          <div className="flex flex-wrap justify-center gap-2 min-h-[120px]">

            <AnimatePresence>

              {myPlayer?.hand?.map((card) => (

                <UnoCard

                  key={card.id}

                  card={card}

                  size="md"

                  playable={playableIds.has(card.id)}

                  onClick={

                    isMyTurn || gameState.phase === 'choosing_color'

                      ? () => handlePlay(card.id)

                      : undefined

                  }

                  layoutId={card.id}

                />

              ))}

            </AnimatePresence>

          </div>



          <div className="flex justify-center gap-3 mt-6">

            {myPlayer && myPlayer.handCount === 1 && !myPlayer.calledUno && (

              <Button onClick={handleCallUno} variant="primary" className="animate-pulse">

                UNO!

              </Button>

            )}

            {isMyTurn && (

              <Button onClick={handleDraw} variant="secondary">

                Draw Card

              </Button>

            )}

            {gameState.players

              .filter((p) => p.playerId !== myPlayerId && p.handCount === 1 && !p.calledUno)

              .map((p) => (

                <Button key={p.playerId} variant="ghost" size="sm" onClick={() => catchUno(p.playerId)}>

                  Catch {p.username}

                </Button>

              ))}

          </div>

        </div>

      </div>



      <GlassCard className="hidden lg:block absolute top-20 right-4 w-48 space-y-4">

        <div>

          <h3 className="text-sm text-white/60 mb-2">Scores</h3>

          {gameState.players.map((p) => (

            <div key={p.playerId} className="flex justify-between text-sm py-1">

              <span className="truncate">{p.username}</span>

              <span className="font-mono">{gameState.scores[p.playerId] ?? 0}</span>

            </div>

          ))}

        </div>

        {myPlayerId && roomId && (

          <VoicePanel roomId={roomId} playerId={myPlayerId} />

        )}

      </GlassCard>



      <AnimatePresence>

        {showColorPicker && (

          <motion.div

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            exit={{ opacity: 0 }}

            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"

          >

            <GlassCard className="text-center">

              <h3 className="font-display font-bold text-xl mb-4">Choose a Color</h3>

              <ColorPicker onSelect={(color: CardColor) => chooseColor(color)} />

            </GlassCard>

          </motion.div>

        )}

      </AnimatePresence>



      <AnimatePresence>

        {(gameState.phase === 'round_end' || gameState.phase === 'game_over') && (

          <motion.div

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            exit={{ opacity: 0 }}

            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"

          >

            <GlassCard className="text-center max-w-md">

              <motion.h2

                initial={{ scale: 0.5 }}

                animate={{ scale: 1 }}

                className="text-4xl font-display font-bold text-gradient mb-4"

              >

                {gameState.phase === 'game_over' ? 'Victory!' : 'Round Over'}

              </motion.h2>

              <p className="text-white/70 mb-6">

                {gameState.lastAction?.message}

              </p>

              {gameState.phase === 'round_end' && (

                <Button onClick={nextRound}>Next Round</Button>

              )}

              {gameState.phase === 'game_over' && (

                <Button onClick={() => navigate('/')}>Back to Home</Button>

              )}

            </GlassCard>

          </motion.div>

        )}

      </AnimatePresence>

    </div>

  );

}

