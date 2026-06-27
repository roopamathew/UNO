import type { HouseRulesConfig } from '../types/houseRules';
import type { GameActionLog, GameMovePayload, GamePlayerState, GameState } from '../types/game';
import {
  type Card,
  type CardColor,
  cardMatches,
  createDeck,
  getCardPoints,
  getPlayableCards,
  isActionCard,
  resetCardIdCounter,
  shuffleDeck,
} from './cards';

export interface EnginePlayer {
  playerId: string;
  userId: string | null;
  username: string;
  avatarColor: string;
  hand: Card[];
  calledUno: boolean;
  isConnected: boolean;
}

export interface InternalGameState {
  gameId: string;
  roomId: string;
  phase: GameState['phase'];
  players: EnginePlayer[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  drawPile: Card[];
  discardPile: Card[];
  wildColor: CardColor | null;
  pendingDraw: number;
  mustChooseColor: boolean;
  lastAction: GameActionLog | null;
  winnerId: string | null;
  roundWinnerId: string | null;
  turnTimerSeconds: number;
  turnStartedAt: string;
  roundNumber: number;
  scores: Record<string, number>;
  rules: HouseRulesConfig;
  moveHistory: string[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function actionLog(
  type: string,
  player: EnginePlayer,
  message: string,
  card?: Card,
): GameActionLog {
  return {
    type,
    playerId: player.playerId,
    username: player.username,
    message,
    card,
    timestamp: nowIso(),
  };
}

function drawCards(state: InternalGameState, player: EnginePlayer, count: number): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (state.drawPile.length === 0) {
      if (state.discardPile.length <= 1) break;
      const top = state.discardPile.pop()!;
      const rest = shuffleDeck(state.discardPile);
      state.discardPile = [top];
      state.drawPile = rest;
    }
    const card = state.drawPile.pop();
    if (!card) break;
    drawn.push(card);
    player.hand.push(card);
  }
  return drawn;
}

function nextIndex(state: InternalGameState, steps = 1): number {
  const len = state.players.length;
  return (state.currentPlayerIndex + state.direction * steps + len * steps) % len;
}

function advanceTurn(state: InternalGameState, steps = 1): void {
  state.currentPlayerIndex = nextIndex(state, steps);
  state.turnStartedAt = nowIso();
  state.players.forEach((p) => {
    p.calledUno = false;
  });
}

function getCurrentPlayer(state: InternalGameState): EnginePlayer {
  return state.players[state.currentPlayerIndex];
}

function topCard(state: InternalGameState): Card {
  return state.discardPile[state.discardPile.length - 1];
}

function flipInitialDiscard(state: InternalGameState): void {
  while (state.drawPile.length > 0) {
    const card = state.drawPile.pop()!;
    if (isActionCard(card.value) && card.value !== 'wild') {
      state.drawPile.unshift(card);
      continue;
    }
    state.discardPile.push(card);
    if (card.color !== 'wild') {
      state.wildColor = card.color;
    }
    break;
  }
}

export function createGame(
  gameId: string,
  roomId: string,
  players: Omit<EnginePlayer, 'hand' | 'calledUno'>[],
  rules: HouseRulesConfig,
  existingScores: Record<string, number> = {},
): InternalGameState {
  resetCardIdCounter();
  const deck = shuffleDeck(createDeck(rules.numberOfDecks));
  const enginePlayers: EnginePlayer[] = players.map((p) => ({
    ...p,
    hand: [],
    calledUno: false,
  }));

  for (let r = 0; r < 7; r++) {
    for (const player of enginePlayers) {
      const card = deck.pop();
      if (card) player.hand.push(card);
    }
  }

  const scores: Record<string, number> = {};
  for (const p of enginePlayers) {
    scores[p.playerId] = existingScores[p.playerId] ?? 0;
  }

  const state: InternalGameState = {
    gameId,
    roomId,
    phase: 'playing',
    players: enginePlayers,
    currentPlayerIndex: 0,
    direction: 1,
    drawPile: deck,
    discardPile: [],
    wildColor: null,
    pendingDraw: 0,
    mustChooseColor: false,
    lastAction: null,
    winnerId: null,
    roundWinnerId: null,
    turnTimerSeconds: rules.turnTimerSeconds,
    turnStartedAt: nowIso(),
    roundNumber: 1,
    scores,
    rules,
    moveHistory: [],
  };

  flipInitialDiscard(state);
  return state;
}

export function toPublicState(
  state: InternalGameState,
  viewerPlayerId?: string,
): GameState {
  const publicPlayers: GamePlayerState[] = state.players.map((p) => ({
    playerId: p.playerId,
    userId: p.userId,
    username: p.username,
    avatarColor: p.avatarColor,
    handCount: p.hand.length,
    hand: viewerPlayerId === p.playerId ? [...p.hand] : undefined,
    calledUno: p.calledUno,
    isConnected: p.isConnected,
  }));

  return {
    gameId: state.gameId,
    roomId: state.roomId,
    phase: state.phase,
    players: publicPlayers,
    currentPlayerIndex: state.currentPlayerIndex,
    direction: state.direction,
    discardTop: topCard(state),
    wildColor: state.wildColor,
    drawPileCount: state.drawPile.length,
    pendingDraw: state.pendingDraw,
    mustChooseColor: state.mustChooseColor,
    lastAction: state.lastAction,
    winnerId: state.winnerId,
    roundWinnerId: state.roundWinnerId,
    turnTimerSeconds: state.turnTimerSeconds,
    turnStartedAt: state.turnStartedAt,
    roundNumber: state.roundNumber,
    scores: { ...state.scores },
    houseRules: { ...state.rules },
  };
}

export function isTurnExpired(state: InternalGameState): boolean {
  if (state.turnTimerSeconds <= 0) return false;
  if (state.phase !== 'playing' && state.phase !== 'choosing_color') return false;
  const elapsed = (Date.now() - new Date(state.turnStartedAt).getTime()) / 1000;
  return elapsed >= state.turnTimerSeconds;
}

export function applyTurnTimeout(state: InternalGameState): { error?: string; action?: GameActionLog } {
  if (!isTurnExpired(state)) return { error: 'Turn not expired' };

  const player = getCurrentPlayer(state);
  if (state.phase === 'choosing_color') {
    const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return applyMove(state, player.playerId, { type: 'choose_color', chosenColor: color });
  }
  return applyMove(state, player.playerId, { type: 'draw' });
}

function applyCardEffect(state: InternalGameState, player: EnginePlayer, card: Card): void {
  switch (card.value) {
    case 'skip':
      advanceTurn(state, 2);
      break;
    case 'reverse':
      if (state.players.length === 2) {
        advanceTurn(state, 2);
      } else {
        state.direction = state.direction === 1 ? -1 : 1;
        advanceTurn(state, 1);
      }
      break;
    case 'draw2':
      state.pendingDraw += 2;
      advanceTurn(state, 1);
      break;
    case 'wild':
      state.mustChooseColor = true;
      state.phase = 'choosing_color';
      break;
    case 'wild4':
      state.pendingDraw += 4;
      state.mustChooseColor = true;
      state.phase = 'choosing_color';
      break;
    default:
      if (state.rules.sevenO && card.value === '7') {
        const next = state.players[nextIndex(state, 1)];
        const temp = player.hand;
        player.hand = next.hand;
        next.hand = temp;
      }
      advanceTurn(state, 1);
      break;
  }
}

function resolveRoundEnd(state: InternalGameState, winner: EnginePlayer): void {
  state.roundWinnerId = winner.playerId;
  let roundPoints = 0;

  for (const p of state.players) {
    if (p.playerId === winner.playerId) continue;
    for (const card of p.hand) {
      roundPoints += getCardPoints(card);
    }
  }

  state.scores[winner.playerId] = (state.scores[winner.playerId] ?? 0) + roundPoints;
  state.phase = 'round_end';
  state.lastAction = actionLog('round_win', winner, `${winner.username} wins the round! (+${roundPoints} pts)`);

  if (state.scores[winner.playerId] >= state.rules.winningScore) {
    state.winnerId = winner.playerId;
    state.phase = 'game_over';
    state.lastAction = actionLog('game_win', winner, `${winner.username} wins the game!`);
  }
}

function playCard(
  state: InternalGameState,
  player: EnginePlayer,
  cardId: string,
  chosenColor?: CardColor,
): string | null {
  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return 'Card not in hand';

  const card = player.hand[cardIndex];
  const top = topCard(state);

  if (!cardMatches(card, top, state.wildColor, state.pendingDraw, state.rules)) {
    return 'Invalid card play';
  }

  if (card.color === 'wild' && !chosenColor && card.value === 'wild') {
    return 'Must choose a color';
  }

  if (card.value === 'wild4' && !chosenColor) {
    return 'Must choose a color for Wild Draw Four';
  }

  player.hand.splice(cardIndex, 1);
  state.discardPile.push(card);
  state.pendingDraw = 0;

  if (card.color === 'wild') {
    state.wildColor = chosenColor ?? null;
  } else {
    state.wildColor = card.color;
  }

  state.lastAction = actionLog('play', player, `played ${card.color} ${card.value}`, card);

  if (player.hand.length === 0) {
    resolveRoundEnd(state, player);
    return null;
  }

  if (player.hand.length === 1) {
    player.calledUno = true;
  }

  applyCardEffect(state, player, card);
  return null;
}

export function applyMove(
  state: InternalGameState,
  playerId: string,
  move: GameMovePayload,
): { error?: string; action?: GameActionLog } {
  if (state.phase === 'game_over' || state.phase === 'round_end') {
    return { error: 'Game is not active' };
  }

  const playerIndex = state.players.findIndex((p) => p.playerId === playerId);
  if (playerIndex === -1) return { error: 'Player not found' };

  const player = state.players[playerIndex];
  const current = getCurrentPlayer(state);
  const moveKey = `${state.roundNumber}-${playerId}-${move.type}-${move.cardId ?? ''}-${Date.now()}`;

  if (state.moveHistory.includes(moveKey)) {
    return { error: 'Duplicate move' };
  }

  switch (move.type) {
    case 'choose_color': {
      if (state.phase !== 'choosing_color' || current.playerId !== playerId) {
        return { error: 'Not your turn to choose color' };
      }
      if (!move.chosenColor || move.chosenColor === 'wild') {
        return { error: 'Invalid color' };
      }
      state.wildColor = move.chosenColor;
      state.mustChooseColor = false;
      state.phase = 'playing';
      state.lastAction = actionLog('choose_color', player, `chose ${move.chosenColor}`);
      if (state.discardPile[state.discardPile.length - 1].value !== 'wild' &&
          state.discardPile[state.discardPile.length - 1].value !== 'wild4') {
        advanceTurn(state, 1);
      } else {
        advanceTurn(state, 1);
      }
      state.moveHistory.push(moveKey);
      return { action: state.lastAction };
    }

    case 'call_uno': {
      if (player.hand.length !== 1) return { error: 'Cannot call UNO' };
      player.calledUno = true;
      state.lastAction = actionLog('uno', player, `${player.username} called UNO!`);
      state.moveHistory.push(moveKey);
      return { action: state.lastAction };
    }

    case 'catch_uno': {
      if (!move.targetPlayerId) return { error: 'Target required' };
      const target = state.players.find((p) => p.playerId === move.targetPlayerId);
      if (!target) return { error: 'Target not found' };
      if (target.hand.length !== 1 || target.calledUno) return { error: 'Cannot catch this player' };
      drawCards(state, target, 2);
      state.lastAction = actionLog('catch', player, `${player.username} caught ${target.username}! (+2 cards)`);
      state.moveHistory.push(moveKey);
      return { action: state.lastAction };
    }

    case 'draw': {
      if (current.playerId !== playerId) return { error: 'Not your turn' };
      if (state.phase === 'choosing_color') return { error: 'Choose a color first' };

      const playable = getPlayableCards(
        player.hand,
        topCard(state),
        state.wildColor,
        state.pendingDraw,
        state.rules,
      );

      if (state.rules.forcePlay && playable.length > 0) {
        return { error: 'You must play a card' };
      }

      const drawCount = state.pendingDraw > 0 ? state.pendingDraw : 1;
      const drawn = drawCards(state, player, drawCount);
      state.pendingDraw = 0;
      state.lastAction = actionLog('draw', player, `drew ${drawn.length} card(s)`);

      if (state.rules.drawUntilPlayable) {
        while (
          getPlayableCards(player.hand, topCard(state), state.wildColor, 0, state.rules).length === 0 &&
          state.drawPile.length > 0
        ) {
          drawCards(state, player, 1);
        }
      }

      advanceTurn(state, 1);
      state.moveHistory.push(moveKey);
      return { action: state.lastAction };
    }

    case 'pass': {
      if (current.playerId !== playerId) return { error: 'Not your turn' };
      advanceTurn(state, 1);
      state.lastAction = actionLog('pass', player, 'passed turn');
      state.moveHistory.push(moveKey);
      return { action: state.lastAction };
    }

    case 'play': {
      if (state.phase === 'choosing_color') return { error: 'Choose a color first' };

      if (state.rules.jumpIn && current.playerId !== playerId) {
        const card = player.hand.find((c) => c.id === move.cardId);
        const top = topCard(state);
        if (!card || card.value !== top.value) {
          return { error: 'Not your turn' };
        }
      } else if (current.playerId !== playerId) {
        return { error: 'Not your turn' };
      }

      if (!move.cardId) return { error: 'Card required' };

      const error = playCard(state, player, move.cardId, move.chosenColor);
      if (error) return { error };

      state.moveHistory.push(moveKey);
      return { action: state.lastAction ?? undefined };
    }

    default:
      return { error: 'Unknown move' };
  }
}

export function startNextRound(state: InternalGameState): InternalGameState {
  if (state.phase !== 'round_end' || state.winnerId) return state;

  const players = state.players.map((p) => ({
    playerId: p.playerId,
    userId: p.userId,
    username: p.username,
    avatarColor: p.avatarColor,
    isConnected: p.isConnected,
  }));

  const next = createGame(state.gameId, state.roomId, players, state.rules, state.scores);
  next.roundNumber = state.roundNumber + 1;
  return next;
}

export function serializeInternalState(state: InternalGameState): object {
  return JSON.parse(JSON.stringify(state));
}

export function deserializeInternalState(data: object): InternalGameState {
  return data as InternalGameState;
}
