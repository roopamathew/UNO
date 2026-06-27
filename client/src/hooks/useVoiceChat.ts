import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/services/socketService';
import { useSettingsStore } from '@/stores/settingsStore';

interface VoicePeer {
  playerId: string;
  username: string;
  stream: MediaStream;
}

interface UseVoiceChatOptions {
  roomId: string;
  playerId: string;
  enabled?: boolean;
}

export function useVoiceChat({ playerId, enabled = true }: UseVoiceChatOptions) {
  const [peers, setPeers] = useState<VoicePeer[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isPushToTalk, setIsPushToTalk] = useState(true);
  const [isTalking, setIsTalking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const voiceVolume = useSettingsStore((s) => s.voiceVolume);

  const getRtcConfig = (): RTCConfiguration => ({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  const createPeerConnection = useCallback(
    (remotePlayerId: string, remoteUsername: string) => {
      const existing = peerConnectionsRef.current.get(remotePlayerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(getRtcConfig());
      peerConnectionsRef.current.set(remotePlayerId, pc);

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (!stream) return;

        setPeers((prev) => {
          const found = prev.find((p) => p.playerId === remotePlayerId);
          if (found) {
            return prev.map((p) => (p.playerId === remotePlayerId ? { ...p, stream } : p));
          }
          return [...prev, { playerId: remotePlayerId, username: remoteUsername, stream }];
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          getSocket()?.emit('voice:signal', {
            targetPlayerId: remotePlayerId,
            signal: event.candidate.toJSON(),
          });
        }
      };

      return pc;
    },
    [],
  );

  const joinVoice = useCallback(async () => {
    if (!enabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !isMuted;
      });

      getSocket()?.emit('voice:join');
      setIsConnected(true);
      setError(null);
    } catch {
      setError('Microphone access denied');
    }
  }, [enabled, isMuted]);

  const leaveVoice = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    setPeers([]);
    setIsConnected(false);

    getSocket()?.emit('voice:leave');
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !enabled) return;

    const onPeerJoined = async ({
      playerId: remoteId,
      username,
    }: {
      playerId: string;
      username: string;
    }) => {
      if (remoteId === playerId || !localStreamRef.current) return;

      const pc = createPeerConnection(remoteId, username);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('voice:signal', {
        targetPlayerId: remoteId,
        signal: offer,
      });
    };

    const onPeerLeft = ({ playerId: remoteId }: { playerId: string }) => {
      peerConnectionsRef.current.get(remoteId)?.close();
      peerConnectionsRef.current.delete(remoteId);
      setPeers((prev) => prev.filter((p) => p.playerId !== remoteId));
    };

    const onSignal = async ({
      fromPlayerId,
      signal,
    }: {
      fromPlayerId: string;
      signal: unknown;
    }) => {
      const rtcSignal = signal as RTCSessionDescriptionInit | RTCIceCandidateInit;
      if (fromPlayerId === playerId) return;

      let pc = peerConnectionsRef.current.get(fromPlayerId);
      if (!pc && localStreamRef.current) {
        pc = createPeerConnection(fromPlayerId, 'Player');
      }
      if (!pc) return;

      if ('type' in rtcSignal && (rtcSignal.type === 'offer' || rtcSignal.type === 'answer')) {
        await pc.setRemoteDescription(new RTCSessionDescription(rtcSignal));
        if (rtcSignal.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice:signal', { targetPlayerId: fromPlayerId, signal: answer });
        }
      } else if (rtcSignal && typeof rtcSignal === 'object' && 'candidate' in rtcSignal) {
        await pc.addIceCandidate(new RTCIceCandidate(rtcSignal as RTCIceCandidateInit));
      }
    };

    socket.on('voice:peer_joined', onPeerJoined);
    socket.on('voice:peer_left', onPeerLeft);
    socket.on('voice:signal', onSignal);

    return () => {
      socket.off('voice:peer_joined', onPeerJoined);
      socket.off('voice:peer_left', onPeerLeft);
      socket.off('voice:signal', onSignal);
    };
  }, [enabled, playerId, createPeerConnection]);

  useEffect(() => {
    peers.forEach((peer) => {
      const audio = document.getElementById(`voice-${peer.playerId}`) as HTMLAudioElement | null;
      if (audio) {
        audio.volume = isDeafened ? 0 : voiceVolume;
      }
    });
  }, [peers, isDeafened, voiceVolume]);

  const toggleMute = () => {
    const next = !isMuted;
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setIsMuted(next);
  };

  const toggleDeafen = () => setIsDeafened((d) => !d);

  const setPushToTalk = (active: boolean) => {
    if (!isPushToTalk) return;
    setIsTalking(active);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = active && !isMuted;
    });
  };

  return {
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
  };
}
