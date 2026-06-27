import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData, GameMovePayload } from '@uno/shared';
import {
  initializeGame,
  handleGameMove,
  handleNextRound,
  handleTurnTimeout,
  getPlayerView,
  restoreGame,
  broadcastGameState,
  setTurnTimeoutHandler,
} from '../services/gameService';
import { getRoomById } from '../services/roomService';
import { prisma } from '../config/database';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function setupGameHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  setTurnTimeoutHandler(async (roomId) => {
    await handleTurnTimeout(roomId);
    emitGameStateToRoom(io, roomId);
  });

  io.on('connection', (socket: AppSocket) => {
    socket.on('game:move', async (move: GameMovePayload) => {
      const roomId = socket.data.roomId;
      const playerId = socket.data.playerId;
      if (!roomId || !playerId) return;

      const { state, error } = await handleGameMove(roomId, playerId, move);
      if (error) {
        socket.emit('game:error', { message: error, code: 'INVALID_MOVE' });
        return;
      }

      emitGameStateToRoom(io, roomId);
    });

    socket.on('game:next_round', async () => {
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;
      if (!roomId || !userId) return;

      const state = await handleNextRound(roomId, userId);
      if (!state) {
        socket.emit('game:error', { message: 'Cannot start next round', code: 'NEXT_ROUND_FAILED' });
        return;
      }

      emitGameStateToRoom(io, roomId);
    });

    socket.on('game:sync', async () => {
      const roomId = socket.data.roomId;
      const playerId = socket.data.playerId;
      if (!roomId || !playerId) return;

      await restoreGame(roomId);
      const view = getPlayerView(roomId, playerId);
      if (view) {
        socket.emit('game:state', view);
      }
    });
  });
}

export async function startGameForRoom(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string,
): Promise<void> {
  const { gameId } = await initializeGame(roomId);

  const room = await getRoomById(roomId);
  io.to(roomId).emit('game:started', { gameId, roomId });
  io.to(roomId).emit('room:update', room);

  emitGameStateToRoom(io, roomId);
}

export function emitGameStateToRoom(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string,
): void {
  broadcastGameState((playerId, state) => {
    prisma.roomPlayer
      .findUnique({ where: { id: playerId }, select: { socketId: true } })
      .then((player) => {
        if (player?.socketId) {
          io.to(player.socketId).emit('game:state', state);
        }
      });
  }, roomId);
}

export function sendGameStateToSocket(socket: AppSocket): void {
  const roomId = socket.data.roomId;
  const playerId = socket.data.playerId;
  if (!roomId || !playerId) return;

  const view = getPlayerView(roomId, playerId);
  if (view) {
    socket.emit('game:state', view);
  }
}
