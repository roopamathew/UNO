import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthStore } from '@/stores/authStore';
import { roomApi } from '@/services/roomApi';
import { useLobbyStore } from '@/stores/lobbyStore';

export function JoinRoomPage() {
  const navigate = useNavigate();
  const { tokens } = useAuthStore();
  const { joinRoom } = useLobbyStore();
  const [code, setCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const room = await roomApi.joinByCode(
        { code: code.toUpperCase(), guestName: guestName || undefined },
        tokens?.accessToken,
      );
      joinRoom(room.id, tokens?.accessToken, guestName || undefined);
      navigate(`/lobby/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <GlassCard className="w-full max-w-md">
        <h1 className="text-2xl font-display font-bold mb-2">Join Room</h1>
        <p className="text-white/50 mb-8">Enter the room code to join a game</p>

        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            label="Room Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            required
            className="text-center text-2xl font-mono tracking-widest uppercase"
          />

          {!tokens && (
            <Input
              label="Your Name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest"
              minLength={2}
              maxLength={20}
              required
            />
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Join Game
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
