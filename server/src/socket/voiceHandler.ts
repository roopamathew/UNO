import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@uno/shared';
import { prisma } from '../config/database';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const voiceParticipants = new Map<string, Set<string>>();

export function setupVoiceHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  io.on('connection', (socket: AppSocket) => {
    socket.on('voice:join', async () => {
      const roomId = socket.data.roomId;
      const playerId = socket.data.playerId;
      if (!roomId || !playerId) return;

      if (!voiceParticipants.has(roomId)) {
        voiceParticipants.set(roomId, new Set());
      }
      voiceParticipants.get(roomId)!.add(playerId);

      const others = await prisma.roomPlayer.findMany({
        where: { roomId, id: { not: playerId } },
        include: { user: { select: { username: true } } },
      });

      for (const other of others) {
        if (voiceParticipants.get(roomId)?.has(other.id)) {
          socket.emit('voice:peer_joined', {
            playerId: other.id,
            username: other.user?.username ?? other.guestName ?? 'Guest',
          });

          if (other.socketId) {
            io.to(other.socketId).emit('voice:peer_joined', {
              playerId,
              username: socket.data.username,
            });
          }
        }
      }
    });

    socket.on('voice:leave', () => {
      const roomId = socket.data.roomId;
      const playerId = socket.data.playerId;
      if (!roomId || !playerId) return;

      voiceParticipants.get(roomId)?.delete(playerId);
      socket.to(roomId).emit('voice:peer_left', { playerId });
    });

    socket.on('voice:signal', async ({ targetPlayerId, signal }) => {
      const target = await prisma.roomPlayer.findUnique({
        where: { id: targetPlayerId },
        select: { socketId: true },
      });

      if (target?.socketId && socket.data.playerId) {
        io.to(target.socketId).emit('voice:signal', {
          fromPlayerId: socket.data.playerId,
          signal,
        });
      }
    });

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      const playerId = socket.data.playerId;
      if (roomId && playerId) {
        voiceParticipants.get(roomId)?.delete(playerId);
        socket.to(roomId).emit('voice:peer_left', { playerId });
      }
    });
  });
}
