import { prisma } from '../config/database';
import { serializeHouseRules } from '../utils/roomSerializer';
import {
  createGame,
  toPublicState,
  applyMove,
  applyTurnTimeout,
  startNextRound,
  serializeInternalState,
  deserializeInternalState,
  type InternalGameState,
} from '@uno/shared';
import type { GameMovePayload, GameState, HouseRulesConfig } from '@uno/shared';
import { addSystemMessage } from './roomService';

const activeGames = new Map<string, InternalGameState>();
const turnTimers = new Map<string, NodeJS.Timeout>();
let turnTimeoutHandler: ((roomId: string) => void) | null = null;

export function setTurnTimeoutHandler(handler: (roomId: string) => void): void {
  turnTimeoutHandler = handler;
}

function clearTurnTimer(roomId: string): void {
  const timer = turnTimers.get(roomId);
  if (timer) clearTimeout(timer);
  turnTimers.delete(roomId);
}

export function resetTurnTimer(roomId: string): void {
  clearTurnTimer(roomId);
  const game = activeGames.get(roomId);
  if (!game || game.turnTimerSeconds <= 0) return;
  if (game.phase === 'round_end' || game.phase === 'game_over') return;

  const elapsed = Date.now() - new Date(game.turnStartedAt).getTime();
  const delay = Math.max(100, game.turnTimerSeconds * 1000 - elapsed);

  turnTimers.set(
    roomId,
    setTimeout(() => {
      turnTimeoutHandler?.(roomId);
    }, delay),
  );
}

export function getActiveGame(roomId: string): InternalGameState | undefined {
  return activeGames.get(roomId);
}

export function getPlayerView(roomId: string, playerId: string): GameState | null {
  const game = activeGames.get(roomId);
  if (!game) return null;
  return toPublicState(game, playerId);
}

export async function initializeGame(roomId: string): Promise<{ gameId: string; state: InternalGameState }> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      players: { include: { user: { select: { username: true } } }, orderBy: { joinedAt: 'asc' } },
      houseRules: true,
      games: {
        where: { status: 'IN_PROGRESS' },
        orderBy: { startedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!room) throw new Error('Room not found');

  const rules = serializeHouseRules(room.houseRules) as HouseRulesConfig;

  const players = room.players.map((p) => ({
    playerId: p.id,
    userId: p.userId,
    username: p.user?.username ?? p.guestName ?? 'Guest',
    avatarColor: p.avatarColor,
    isConnected: p.isConnected,
  }));

  const game = await prisma.game.create({
    data: {
      roomId,
      status: 'IN_PROGRESS',
      gameState: {},
      players: {
        create: players.map((p) => ({
          userId: p.userId,
          username: p.username,
        })),
      },
    },
  });

  const state = createGame(game.id, roomId, players, rules);
  activeGames.set(roomId, state);

  await prisma.room.update({
    where: { id: roomId },
    data: { status: 'IN_PROGRESS' },
  });

  await prisma.game.update({
    where: { id: game.id },
    data: { gameState: serializeInternalState(state) as object },
  });

  resetTurnTimer(roomId);

  return { gameId: game.id, state };
}

export async function persistGameState(roomId: string): Promise<void> {
  const state = activeGames.get(roomId);
  if (!state) return;

  await prisma.game.update({
    where: { id: state.gameId },
    data: { gameState: serializeInternalState(state) as object },
  });
}

export async function handleGameMove(
  roomId: string,
  playerId: string,
  move: GameMovePayload,
): Promise<{ state: GameState; error?: string }> {
  const game = activeGames.get(roomId);
  if (!game) {
    return { state: null as unknown as GameState, error: 'No active game' };
  }

  const result = applyMove(game, playerId, move);
  if (result.error) {
    return { state: toPublicState(game, playerId), error: result.error };
  }

  await logMove(game, playerId, move);
  await persistGameState(roomId);
  resetTurnTimer(roomId);

  if (game.phase === 'game_over') {
    clearTurnTimer(roomId);
    await finalizeGame(roomId, game);
  }

  return { state: toPublicState(game, playerId) };
}

async function logMove(
  game: InternalGameState,
  playerId: string,
  move: GameMovePayload,
): Promise<void> {
  const player = game.players.find((p) => p.playerId === playerId);
  await prisma.move.create({
    data: {
      gameId: game.gameId,
      userId: player?.userId ?? null,
      moveType: move.type,
      moveData: move as object,
      turnNumber: game.moveHistory.length,
    },
  });
}

export async function handleTurnTimeout(roomId: string): Promise<void> {
  const game = activeGames.get(roomId);
  if (!game) return;

  const player = game.players[game.currentPlayerIndex];
  const result = applyTurnTimeout(game);
  if (result.error) return;

  await logMove(game, player.playerId, { type: 'draw' });
  await persistGameState(roomId);

  if (game.phase === 'game_over') {
    clearTurnTimer(roomId);
    await finalizeGame(roomId, game);
  } else {
    resetTurnTimer(roomId);
  }
}

export async function handleNextRound(roomId: string, requestingUserId: string): Promise<GameState | null> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.hostId !== requestingUserId) return null;

  const game = activeGames.get(roomId);
  if (!game) return null;

  const next = startNextRound(game);
  activeGames.set(roomId, next);
  await persistGameState(roomId);
  resetTurnTimer(roomId);
  return toPublicState(next);
}

async function finalizeGame(roomId: string, state: InternalGameState): Promise<void> {
  if (!state.winnerId) return;

  const winner = state.players.find((p) => p.playerId === state.winnerId);
  if (!winner) return;

  await prisma.game.update({
    where: { id: state.gameId },
    data: {
      status: 'COMPLETED',
      winnerId: winner.userId,
      endedAt: new Date(),
      gameState: serializeInternalState(state) as object,
    },
  });

  await prisma.room.update({
    where: { id: roomId },
    data: { status: 'FINISHED' },
  });

  for (const player of state.players) {
    await prisma.gamePlayer.updateMany({
      where: { gameId: state.gameId, username: player.username },
      data: {
        score: state.scores[player.playerId] ?? 0,
        isWinner: player.playerId === state.winnerId,
      },
    });
  }

  for (const player of state.players) {
    if (!player.userId) continue;

    const isWinner = player.playerId === state.winnerId;
    const stats = await prisma.userStats.findUnique({ where: { userId: player.userId } });

    if (stats) {
      const wins = stats.wins + (isWinner ? 1 : 0);
      const losses = stats.losses + (isWinner ? 0 : 1);
      const currentWinStreak = isWinner ? stats.currentWinStreak + 1 : 0;

      await prisma.userStats.update({
        where: { userId: player.userId },
        data: {
          wins,
          losses,
          gamesPlayed: stats.gamesPlayed + 1,
          totalPoints: stats.totalPoints + (state.scores[player.playerId] ?? 0),
          currentWinStreak,
          longestWinStreak: Math.max(stats.longestWinStreak, currentWinStreak),
        },
      });
    }
  }

  activeGames.delete(roomId);
  clearTurnTimer(roomId);
}

export async function restoreGame(roomId: string): Promise<InternalGameState | null> {
  if (activeGames.has(roomId)) return activeGames.get(roomId)!;

  const game = await prisma.game.findFirst({
    where: { roomId, status: 'IN_PROGRESS' },
    orderBy: { startedAt: 'desc' },
  });

  if (!game?.gameState) return null;

  const state = deserializeInternalState(game.gameState as object);
  activeGames.set(roomId, state);
  resetTurnTimer(roomId);
  return state;
}

export function broadcastGameState(
  emitToPlayer: (playerId: string, state: GameState) => void,
  roomId: string,
): void {
  const game = activeGames.get(roomId);
  if (!game) return;

  for (const player of game.players) {
    emitToPlayer(player.playerId, toPublicState(game, player.playerId));
  }
}

export async function addGameMessage(roomId: string, content: string) {
  return addSystemMessage(roomId, content);
}
