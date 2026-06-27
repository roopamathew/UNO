import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthStore } from '@/stores/authStore';
import { roomApi } from '@/services/roomApi';
import { useLobbyStore } from '@/stores/lobbyStore';

export function StartGamePage() {
  const navigate = useNavigate();
  const { isAuthenticated, tokens } = useAuthStore();
  const { joinRoom } = useLobbyStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!isAuthenticated || !tokens?.accessToken) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const room = await roomApi.create({}, tokens.accessToken);
      joinRoom(room.id, tokens.accessToken);
      navigate(`/lobby/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <GlassCard className="w-full max-w-lg text-center">
        <h1 className="text-3xl font-display font-bold mb-4">Start a Game</h1>
        <p className="text-white/50 mb-8">
          Create a new room and invite your friends to play
        </p>

        {error && (
          <p className="text-red-400 text-sm mb-4 bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>
        )}

        <div className="space-y-4">
          <Button
            onClick={handleCreateRoom}
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            Create Room
          </Button>

          <Link to="/join">
            <Button variant="secondary" className="w-full" size="lg">
              Join Existing Room
            </Button>
          </Link>

          <Link to="/ai-game">
            <Button variant="ghost" className="w-full">
              Play vs AI
            </Button>
          </Link>
        </div>

        {!isAuthenticated && (
          <p className="mt-6 text-sm text-white/40">
            <Link to="/login" className="text-uno-red hover:underline">Sign in</Link> to save your stats
          </p>
        )}
      </GlassCard>
    </div>
  );
}
