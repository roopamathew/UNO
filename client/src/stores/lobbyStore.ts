import { create } from 'zustand';
import type { Room, ChatMessage } from '@uno/shared';
import { connectSocket, disconnectSocket, getSocket } from '../services/socketService';
import { useAuthStore } from './authStore';
import { useGameStore } from './gameStore';

interface LobbyState {
  room: Room | null;
  messages: ChatMessage[];
  isConnected: boolean;
  isHost: boolean;
  error: string | null;
  countdown: number | null;

  joinRoom: (roomId: string, token?: string | null, guestName?: string) => void;
  leaveRoom: () => void;
  toggleReady: (isReady: boolean) => void;
  sendMessage: (content: string) => void;
  startGame: () => void;
  kickPlayer: (playerId: string) => void;
  updateHouseRules: (rules: Partial<Room['houseRules']>) => void;
  setRoom: (room: Room) => void;
  clearError: () => void;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  room: null,
  messages: [],
  isConnected: false,
  isHost: false,
  error: null,
  countdown: null,

  joinRoom: (roomId, token, guestName) => {
    const socket = connectSocket(token, guestName);

    socket.off('room:update');
    socket.off('room:error');
    socket.off('chat:message');
    socket.off('chat:history');
    socket.off('player:kicked');
    socket.off('game:starting');
    socket.off('game:started');
    socket.off('game:state');
    socket.off('game:error');
    socket.off('player:ping');

    socket.on('connect', () => {
      set({ isConnected: true });
      socket.emit('room:join', { roomId, token: token ?? undefined });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('room:update', (room) => {
      const user = useAuthStore.getState().user;
      const isHost = room.hostId === user?.id;
      set({ room, isHost });
    });

    socket.on('room:error', ({ message }) => {
      set({ error: message });
    });

    socket.on('chat:history', (messages) => {
      set({ messages });
    });

    socket.on('chat:message', (message) => {
      set((state) => ({ messages: [...state.messages, message] }));
    });

    socket.on('player:kicked', ({ reason }) => {
      set({ error: reason, room: null });
      disconnectSocket();
    });

    socket.on('game:starting', ({ countdown }) => {
      set({ countdown });
    });

    socket.on('game:started', ({ roomId: startedRoomId }) => {
      set({ countdown: null });
      useGameStore.getState().requestSync();
      window.location.href = `/game/${startedRoomId}`;
    });

    socket.on('game:state', (state) => {
      useGameStore.getState().setGameState(state);
    });

    socket.on('game:error', ({ message }) => {
      useGameStore.setState({ error: message });
    });

    socket.on('player:ping', ({ playerId, ping }) => {
      set((state) => {
        if (!state.room) return state;
        return {
          room: {
            ...state.room,
            players: state.room.players.map((p) =>
              p.id === playerId ? { ...p, ping } : p,
            ),
          },
        };
      });
    });

    if (socket.connected) {
      socket.emit('room:join', { roomId, token: token ?? undefined });
    }
  },

  leaveRoom: () => {
    const socket = getSocket();
    socket?.emit('room:leave');
    disconnectSocket();
    set({ room: null, messages: [], isConnected: false, countdown: null });
  },

  toggleReady: (isReady) => {
    getSocket()?.emit('player:ready', { isReady });
  },

  sendMessage: (content) => {
    getSocket()?.emit('chat:message', { content });
  },

  startGame: () => {
    getSocket()?.emit('game:start');
  },

  kickPlayer: (playerId) => {
    getSocket()?.emit('room:kick', { playerId });
  },

  updateHouseRules: (rules) => {
    getSocket()?.emit('house-rules:update', { rules });
  },

  setRoom: (room) => set({ room }),
  clearError: () => set({ error: null }),
}));
