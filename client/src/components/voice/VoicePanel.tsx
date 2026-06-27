import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useVoiceChat } from '@/hooks/useVoiceChat';

interface VoicePanelProps {
  roomId: string;
  playerId: string;
}

export function VoicePanel({ roomId, playerId }: VoicePanelProps) {
  const {
    peers,
    isMuted,
    isDeafened,
    isPushToTalk,
    isTalking,
    isConnected,
    error,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
    setIsPushToTalk,
    setPushToTalk,
  } = useVoiceChat({ roomId, playerId });

  return (
    <GlassCard className="space-y-3">
      <h3 className="font-semibold text-sm text-white/60">Voice Chat</h3>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {!isConnected ? (
        <Button size="sm" onClick={joinVoice}>
          Join Voice
        </Button>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={isMuted ? 'ghost' : 'secondary'} onClick={toggleMute}>
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
            <Button size="sm" variant={isDeafened ? 'ghost' : 'secondary'} onClick={toggleDeafen}>
              {isDeafened ? 'Undeafen' : 'Deafen'}
            </Button>
            <Button
              size="sm"
              variant={isPushToTalk ? 'primary' : 'secondary'}
              onClick={() => setIsPushToTalk(!isPushToTalk)}
            >
              PTT {isPushToTalk ? 'On' : 'Off'}
            </Button>
            <Button size="sm" variant="ghost" onClick={leaveVoice}>
              Leave
            </Button>
          </div>

          {isPushToTalk && (
            <button
              type="button"
              onMouseDown={() => setPushToTalk(true)}
              onMouseUp={() => setPushToTalk(false)}
              onTouchStart={() => setPushToTalk(true)}
              onTouchEnd={() => setPushToTalk(false)}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                isTalking ? 'bg-green-500/30 border-green-500' : 'bg-white/5 border-white/10'
              } border`}
            >
              {isTalking ? '🎤 Talking...' : 'Hold to Talk'}
            </button>
          )}

          {peers.length > 0 && (
            <div className="space-y-1">
              {peers.map((peer) => (
                <div key={peer.playerId} className="flex items-center gap-2 text-xs text-white/50">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {peer.username}
                  <audio
                    id={`voice-${peer.playerId}`}
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el && el.srcObject !== peer.stream) {
                        el.srcObject = peer.stream;
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}
