import type { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import {
  getRoomById,
  setPlayerReady,
  setPlayerConnected,
  updatePlayerPing,
  updateRoomSettings,
  updateHouseRules,
  kickPlayer,
  addSystemMessage,
  addChatMessage,
  getChatHistory,
  RoomError,
} from '../services/roomService';
import { serializeRoom, roomInclude } from '../utils/roomSerializer';
import { startGameForRoom, sendGameStateToSocket } from './gameHandler';
import { restoreGame } from '../services/gameService';
import type { Message, RoomPlayer } from '@prisma/client';
import { prisma } from '../config/database';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@uno/shared';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const roomSockets = new Map<string, Set<string>>();

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  io.use(async (socket: AppSocket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;
      const guestName = (socket.handshake.auth.guestName as string) || 'Guest';

      if (token) {
        const payload = verifyAccessToken(token);
        socket.data.userId = payload.userId;
        socket.data.username = payload.username;
      } else {
        socket.data.username = guestName;
      }

      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AppSocket) => {
    let playerId: string | undefined;
    let roomId: string | undefined;
    let pingInterval: NodeJS.Timeout | undefined;

    socket.on('room:join', async ({ roomId: joinRoomId }) => {
      try {
        roomId = joinRoomId;
        socket.data.roomId = joinRoomId;

        const room = await prisma.room.findUnique({
          where: { id: joinRoomId },
          include: roomInclude,
        });

        if (!room) {
          socket.emit('room:error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
          return;
        }

        let player = room.players.find(
          (p: RoomPlayer) =>
            (socket.data.userId && p.userId === socket.data.userId) ||
            (!socket.data.userId && p.guestName === socket.data.username),
        );

        if (!player && room.players.length < room.maxPlayers && room.status === 'WAITING') {
          const created = await prisma.roomPlayer.create({
            data: {
              roomId: joinRoomId,
              userId: socket.data.userId ?? null,
              guestName: socket.data.userId ? null : socket.data.username,
              avatarColor: '#3B82F6',
              isConnected: true,
              socketId: socket.id,
            },
          });
          player = { ...created, user: null };
        }

        if (!player) {
          socket.emit('room:error', { message: 'Cannot join room', code: 'JOIN_FAILED' });
          return;
        }

        playerId = player.id;
        socket.data.playerId = player.id;

        await setPlayerConnected(player.id, true, socket.id);
        socket.join(joinRoomId);

        if (!roomSockets.has(joinRoomId)) {
          roomSockets.set(joinRoomId, new Set());
        }
        roomSockets.get(joinRoomId)!.add(socket.id);

        const history = await getChatHistory(joinRoomId);
        socket.emit(
          'chat:history',
          history.map((m: Message) => ({
            id: m.id,
            roomId: m.roomId,
            senderId: m.senderId,
            senderName: m.senderName,
            content: m.content,
            type: m.type,
            createdAt: m.createdAt.toISOString(),
          })),
        );

        const systemMsg = await addSystemMessage(joinRoomId, `${socket.data.username} joined the room`);
        io.to(joinRoomId).emit('chat:message', {
          id: systemMsg.id,
          roomId: systemMsg.roomId,
          senderId: null,
          senderName: 'System',
          content: systemMsg.content,
          type: 'SYSTEM',
          createdAt: systemMsg.createdAt.toISOString(),
        });

        const updatedRoom = await getRoomById(joinRoomId);
        io.to(joinRoomId).emit('room:update', updatedRoom);

        if (updatedRoom.status === 'IN_PROGRESS') {
          await restoreGame(joinRoomId);
          sendGameStateToSocket(socket);
        }

        pingInterval = setInterval(async () => {
          if (!playerId) return;
          const start = Date.now();
          socket.emit('player:ping', { playerId, ping: 0 });
          socket.once('player:ping', async () => {
            const ping = Date.now() - start;
            await updatePlayerPing(playerId!, ping);
            io.to(joinRoomId!).emit('player:ping', { playerId: playerId!, ping });
          });
        }, 5000);
      } catch (err) {
        socket.emit('room:error', {
          message: err instanceof Error ? err.message : 'Join failed',
          code: 'JOIN_ERROR',
        });
      }
    });

    socket.on('player:ready', async ({ isReady }) => {
      if (!playerId || !roomId) return;
      await setPlayerReady(playerId, isReady);
      const room = await getRoomById(roomId);
      io.to(roomId).emit('room:update', room);
    });

    socket.on('room:settings:update', async ({ settings }) => {
      if (!roomId || !socket.data.userId) return;
      try {
        const room = await updateRoomSettings(roomId, socket.data.userId, settings);
        io.to(roomId).emit('room:update', room);
      } catch (err) {
        if (err instanceof RoomError) {
          socket.emit('room:error', { message: err.message, code: err.code });
        }
      }
    });

    socket.on('house-rules:update', async ({ rules }) => {
      if (!roomId || !socket.data.userId) return;
      try {
        const room = await updateHouseRules(roomId, socket.data.userId, rules);
        io.to(roomId).emit('room:update', room);
      } catch (err) {
        if (err instanceof RoomError) {
          socket.emit('room:error', { message: err.message, code: err.code });
        }
      }
    });

    socket.on('room:kick', async ({ playerId: targetId }) => {
      if (!roomId || !socket.data.userId) return;
      try {
        await kickPlayer(roomId, socket.data.userId, targetId);

        const roomSocketSet = roomSockets.get(roomId);
        if (roomSocketSet) {
          for (const sid of roomSocketSet) {
            const s = io.sockets.sockets.get(sid) as AppSocket | undefined;
            if (s?.data.playerId === targetId) {
              s.emit('player:kicked', { reason: 'Kicked by host' });
              s.disconnect(true);
            }
          }
        }

        const room = await getRoomById(roomId);
        io.to(roomId).emit('room:update', room);
      } catch (err) {
        if (err instanceof RoomError) {
          socket.emit('room:error', { message: err.message, code: err.code });
        }
      }
    });

    socket.on('chat:message', async ({ content }) => {
      if (!roomId || !content.trim()) return;
      const msg = await addChatMessage(
        roomId,
        socket.data.userId ?? null,
        socket.data.username,
        content.trim(),
      );
      io.to(roomId).emit('chat:message', {
        id: msg.id,
        roomId: msg.roomId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content,
        type: msg.type,
        createdAt: msg.createdAt.toISOString(),
      });
    });

    socket.on('game:start', async () => {
      if (!roomId || !socket.data.userId) return;

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { players: true },
      });

      if (!room || room.hostId !== socket.data.userId) {
        socket.emit('room:error', { message: 'Only host can start', code: 'NOT_HOST' });
        return;
      }

      const allReady = room.players.every((p: RoomPlayer) => p.isReady || p.isHost);
      if (!allReady || room.players.length < 2) {
        socket.emit('room:error', { message: 'All players must be ready', code: 'NOT_READY' });
        return;
      }

      let countdown = 3;
      io.to(roomId).emit('game:starting', { countdown });

      const interval = setInterval(async () => {
        countdown--;
        if (countdown > 0) {
          io.to(roomId!).emit('game:starting', { countdown });
        } else {
          clearInterval(interval);
          try {
            await startGameForRoom(io, roomId!);
          } catch (err) {
            socket.emit('room:error', {
              message: err instanceof Error ? err.message : 'Failed to start game',
              code: 'START_FAILED',
            });
          }
        }
      }, 1000);
    });

    socket.on('room:leave', async () => {
      await handleDisconnect();
    });

    socket.on('disconnect', async () => {
      await handleDisconnect();
    });

    async function handleDisconnect() {
      if (pingInterval) clearInterval(pingInterval);

      if (playerId && roomId) {
        await setPlayerConnected(playerId, false);

        const roomSocketSet = roomSockets.get(roomId);
        roomSocketSet?.delete(socket.id);
        if (roomSocketSet?.size === 0) {
          roomSockets.delete(roomId);
        }

        const systemMsg = await addSystemMessage(roomId, `${socket.data.username} left the room`);
        io.to(roomId).emit('chat:message', {
          id: systemMsg.id,
          roomId: systemMsg.roomId,
          senderId: null,
          senderName: 'System',
          content: systemMsg.content,
          type: 'SYSTEM',
          createdAt: systemMsg.createdAt.toISOString(),
        });

        const room = await getRoomById(roomId);
        io.to(roomId).emit('room:update', room);
      }
    }
  });
}
