import type { Room, RoomPlayer } from './room';
import type { HouseRulesConfig } from './houseRules';
import type { GameMovePayload, GameState } from './game';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string | null;
  senderName: string;
  content: string;
  type: 'USER' | 'SYSTEM' | 'GAME';
  createdAt: string;
}

// Client -> Server
export interface ClientToServerEvents {
  'room:join': (payload: { roomId: string; token?: string }) => void;
  'room:leave': () => void;
  'room:kick': (payload: { playerId: string }) => void;
  'room:settings:update': (payload: { settings: Partial<Room['settings']> }) => void;
  'player:ready': (payload: { isReady: boolean }) => void;
  'player:ping': () => void;
  'game:start': () => void;
  'chat:message': (payload: { content: string }) => void;
  'house-rules:update': (payload: { rules: Partial<HouseRulesConfig> }) => void;
  'game:move': (payload: GameMovePayload) => void;
  'game:next_round': () => void;
  'game:sync': () => void;
  // Voice (Phase 4)
  'voice:join': () => void;
  'voice:leave': () => void;
  'voice:signal': (payload: { targetPlayerId: string; signal: unknown }) => void;
}

// Server -> Client
export interface ServerToClientEvents {
  'room:update': (room: Room) => void;
  'room:error': (payload: { message: string; code: string }) => void;
  'player:ping': (payload: { playerId: string; ping: number }) => void;
  'chat:message': (message: ChatMessage) => void;
  'chat:history': (messages: ChatMessage[]) => void;
  'player:kicked': (payload: { reason: string }) => void;
  'game:starting': (payload: { countdown: number }) => void;
  'game:started': (payload: { gameId: string; roomId: string }) => void;
  'game:state': (state: GameState) => void;
  'game:error': (payload: { message: string; code: string }) => void;
  // Voice (Phase 4)
  'voice:peer_joined': (payload: { playerId: string; username: string }) => void;
  'voice:peer_left': (payload: { playerId: string }) => void;
  'voice:signal': (payload: { fromPlayerId: string; signal: unknown }) => void;
}

export interface SocketData {
  userId?: string;
  username: string;
  roomId?: string;
  playerId?: string;
}

export interface LobbyState {
  room: Room | null;
  players: RoomPlayer[];
  isConnected: boolean;
  isHost: boolean;
  error: string | null;
}
