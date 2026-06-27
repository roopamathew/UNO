import type { HouseRulesConfig } from './houseRules';

export type RoomStatus = 'WAITING' | 'STARTING' | 'IN_PROGRESS' | 'FINISHED';

export interface RoomPlayer {
  id: string;
  userId: string | null;
  username: string;
  avatarUrl: string | null;
  avatarColor: string;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  ping: number;
  joinedAt: string;
}

export interface RoomSettings {
  isPrivate: boolean;
  maxPlayers: number;
  allowSpectators: boolean;
  name: string;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  houseRules: HouseRulesConfig;
  players: RoomPlayer[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomRequest {
  name?: string;
  isPrivate?: boolean;
  maxPlayers?: number;
  houseRules?: Partial<HouseRulesConfig>;
}

export interface JoinRoomRequest {
  code: string;
  guestName?: string;
}

export interface UpdateRoomSettingsRequest {
  name?: string;
  isPrivate?: boolean;
  maxPlayers?: number;
  allowSpectators?: boolean;
}
