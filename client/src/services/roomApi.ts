import type { CreateRoomRequest, JoinRoomRequest, Room, HouseRulesConfig } from '@uno/shared';
import { api } from './api';

export const roomApi = {
  create: (data: CreateRoomRequest, token: string) =>
    api.post<Room>('/api/rooms', data, token),

  getById: (id: string, token?: string | null) =>
    api.get<Room>(`/api/rooms/${id}`, token),

  getByCode: (code: string, token?: string | null) =>
    api.get<Room>(`/api/rooms/code/${code}`, token),

  joinByCode: (data: JoinRoomRequest, token?: string | null) =>
    api.post<Room>('/api/rooms/join-by-code', data, token),

  join: (roomId: string, guestName?: string, token?: string | null) =>
    api.post<Room>(`/api/rooms/${roomId}/join`, { code: '', guestName }, token),

  updateSettings: (roomId: string, settings: Partial<Room['settings']>, token: string) =>
    api.patch<Room>(`/api/rooms/${roomId}/settings`, settings, token),

  updateHouseRules: (roomId: string, rules: Partial<HouseRulesConfig>, token: string) =>
    api.patch<Room>(`/api/rooms/${roomId}/house-rules`, rules, token),

  kickPlayer: (roomId: string, playerId: string, token: string) =>
    api.post<Room>(`/api/rooms/${roomId}/kick/${playerId}`, {}, token),
};
