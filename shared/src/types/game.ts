import type { CardColor, CardValue } from '../game/cards';
import type { Card } from '../game/cards';
import type { HouseRulesConfig } from './houseRules';

export type { Card, CardColor, CardValue };

export type GamePhase =
  | 'playing'
  | 'choosing_color'
  | 'round_end'
  | 'game_over';

export interface GamePlayerState {
  playerId: string;
  userId: string | null;
  username: string;
  avatarColor: string;
  handCount: number;
  hand?: Card[];
  calledUno: boolean;
  isConnected: boolean;
}

export interface GameActionLog {
  type: string;
  playerId: string;
  username: string;
  message: string;
  card?: Card;
  timestamp: string;
}

export interface GameState {
  gameId: string;
  roomId: string;
  phase: GamePhase;
  players: GamePlayerState[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  discardTop: Card;
  wildColor: CardColor | null;
  drawPileCount: number;
  pendingDraw: number;
  mustChooseColor: boolean;
  lastAction: GameActionLog | null;
  winnerId: string | null;
  roundWinnerId: string | null;
  turnTimerSeconds: number;
  turnStartedAt: string;
  roundNumber: number;
  scores: Record<string, number>;
  houseRules: HouseRulesConfig;
}

export type GameMoveType =
  | 'play'
  | 'draw'
  | 'pass'
  | 'call_uno'
  | 'catch_uno'
  | 'choose_color';

export interface GameMovePayload {
  type: GameMoveType;
  cardId?: string;
  chosenColor?: CardColor;
  targetPlayerId?: string;
}

export interface GameMoveResult {
  success: boolean;
  error?: string;
  state?: GameState;
  action?: GameActionLog;
}
