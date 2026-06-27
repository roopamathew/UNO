export const APP_NAME = 'UNO Arena';

export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;
export const DEFAULT_WINNING_SCORE = 500;
export const DEFAULT_TURN_TIMER_SECONDS = 30;
export const ROOM_CODE_LENGTH = 6;
export const MAX_CUSTOM_RULES = 10;

export const AVATAR_COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#06B6D4',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
] as const;

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Room
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_UPDATE: 'room:update',
  ROOM_KICK: 'room:kick',
  ROOM_SETTINGS_UPDATE: 'room:settings:update',

  // Lobby
  PLAYER_READY: 'player:ready',
  PLAYER_PING: 'player:ping',
  GAME_START: 'game:start',

  // Chat
  CHAT_MESSAGE: 'chat:message',
  CHAT_HISTORY: 'chat:history',

  // Game (Phase 3+)
  GAME_STATE: 'game:state',
  GAME_MOVE: 'game:move',
  GAME_UNO: 'game:uno',
  GAME_DRAW: 'game:draw',

  // Voice (Phase 4+)
  VOICE_SIGNAL: 'voice:signal',
  VOICE_JOIN: 'voice:join',
  VOICE_LEAVE: 'voice:leave',
} as const;

export const API_ROUTES = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    GOOGLE: '/api/auth/google',
    GOOGLE_CALLBACK: '/api/auth/google/callback',
    ME: '/api/auth/me',
  },
  ROOMS: {
    BASE: '/api/rooms',
    BY_ID: (id: string) => `/api/rooms/${id}`,
    JOIN: (id: string) => `/api/rooms/${id}/join`,
  },
  USERS: {
    STATS: '/api/users/stats',
    SETTINGS: '/api/users/settings',
    LEADERBOARD: '/api/users/leaderboard',
  },
  HOUSE_RULES: {
    BASE: '/api/house-rules',
    BY_ROOM: (roomId: string) => `/api/house-rules/room/${roomId}`,
  },
} as const;
