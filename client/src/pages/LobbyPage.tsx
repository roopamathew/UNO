import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthStore } from '@/stores/authStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { copyToClipboard, formatTimestamp } from '@/utils/helpers';
import { VoicePanel } from '@/components/voice/VoicePanel';
import type { RoomPlayer } from '@uno/shared';

function PlayerAvatar({ player }: { player: RoomPlayer }) {
  return (
    <div className="relative">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
        style={{ backgroundColor: player.avatarColor }}
      >
        {player.username[0].toUpperCase()}
      </div>
      <span
        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-uno-darker ${
          player.isConnected ? 'bg-green-500' : 'bg-gray-500'
        }`}
      />
    </div>
  );
}

function ChatPanel() {
  const { messages, sendMessage } = useLobbyStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <GlassCard className="flex flex-col h-[400px]">
      <h3 className="font-semibold mb-3 text-sm text-white/60">Chat</h3>
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm ${
              msg.type === 'SYSTEM' ? 'text-white/40 italic' : ''
            }`}
          >
            {msg.type !== 'SYSTEM' && (
              <span className="font-medium text-white/70">{msg.senderName}: </span>
            )}
            <span>{msg.content}</span>
            <span className="text-white/20 text-xs ml-2">
              {formatTimestamp(msg.createdAt)}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="input-field flex-1 text-sm py-2"
          maxLength={500}
        />
        <Button type="submit" size="sm" variant="secondary">
          Send
        </Button>
      </form>
    </GlassCard>
  );
}

export function LobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { tokens, user } = useAuthStore();
  const {
    room,
    isConnected,
    isHost,
    error,
    countdown,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    kickPlayer,
    clearError,
  } = useLobbyStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (roomId) {
      joinRoom(roomId, tokens?.accessToken);
    }
    return () => {
      leaveRoom();
    };
  }, [roomId]);

  const currentPlayer = room?.players.find(
    (p) => p.userId === user?.id || (!user && p.username !== 'Guest'),
  );

  const allReady = room?.players.every((p) => p.isReady || p.isHost) ?? false;
  const canStart = isHost && allReady && (room?.players.length ?? 0) >= 2;

  const handleCopyCode = async () => {
    if (room?.code) {
      await copyToClipboard(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    if (room?.code) {
      const link = `${window.location.origin}/join?code=${room.code}`;
      await copyToClipboard(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!room) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-uno-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Connecting to lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <motion.span
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-9xl font-display font-bold text-gradient"
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{room.settings.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-white/40 text-sm">
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
            <span className="text-white/40 text-sm">
              {room.players.length}/{room.settings.maxPlayers} players
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyCode}
            className="glass px-4 py-2 rounded-xl font-mono text-lg tracking-widest hover:bg-white/10 transition-colors"
          >
            {room.code} {copied ? '✓' : '📋'}
          </button>
          <button
            onClick={handleCopyLink}
            className="btn-secondary text-sm"
          >
            Copy Invite Link
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Players */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard>
            <h2 className="font-semibold mb-4">Players</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {room.players.map((player) => (
                <motion.div
                  key={player.id}
                  layout
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                >
                  <PlayerAvatar player={player} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{player.username}</span>
                      {player.isHost && (
                        <span className="text-xs bg-uno-yellow/20 text-uno-yellow px-2 py-0.5 rounded-full">
                          Host
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span>{player.ping}ms</span>
                      <span>{player.isReady ? '✅ Ready' : '⏳ Not ready'}</span>
                    </div>
                  </div>
                  {isHost && !player.isHost && (
                    <button
                      onClick={() => kickPlayer(player.id)}
                      className="text-red-400 hover:text-red-300 text-sm px-2"
                      title="Kick player"
                    >
                      ✕
                    </button>
                  )}
                </motion.div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: room.settings.maxPlayers - room.players.length }).map(
                (_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center justify-center p-3 rounded-xl border border-dashed border-white/10 text-white/20 text-sm"
                  >
                    Waiting for player...
                  </div>
                ),
              )}
            </div>
          </GlassCard>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {!isHost && (
              <Button
                onClick={() => toggleReady(!currentPlayer?.isReady)}
                variant={currentPlayer?.isReady ? 'secondary' : 'primary'}
              >
                {currentPlayer?.isReady ? 'Not Ready' : 'Ready Up'}
              </Button>
            )}

            {isHost && (
              <>
                <Button onClick={startGame} disabled={!canStart}>
                  Start Game
                </Button>
                <Link to={`/lobby/${roomId}/house-rules`}>
                  <Button variant="secondary">House Rules</Button>
                </Link>
              </>
            )}

            <Button variant="ghost" onClick={() => { leaveRoom(); navigate('/'); }}>
              Leave Room
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <GlassCard>
            <h3 className="font-semibold mb-3 text-sm text-white/60">House Rules</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Winning Score</span>
                <span>{room.houseRules.winningScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Decks</span>
                <span>{room.houseRules.numberOfDecks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Turn Timer</span>
                <span>{room.houseRules.turnTimerSeconds}s</span>
              </div>
              {room.houseRules.stackDrawTwo && (
                <span className="text-xs bg-white/5 px-2 py-1 rounded inline-block mr-1">Stack +2</span>
              )}
              {room.houseRules.jumpIn && (
                <span className="text-xs bg-white/5 px-2 py-1 rounded inline-block mr-1">Jump-In</span>
              )}
            </div>
            {isHost && (
              <Link
                to={`/lobby/${roomId}/house-rules`}
                className="text-uno-red text-sm mt-3 inline-block hover:underline"
              >
                Edit Rules →
              </Link>
            )}
          </GlassCard>

          <ChatPanel />

          {currentPlayer && roomId && (
            <VoicePanel roomId={roomId} playerId={currentPlayer.id} />
          )}
        </div>
      </div>
    </div>
  );
}
