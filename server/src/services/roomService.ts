import type { Prisma, RoomPlayer } from '@prisma/client';
import { prisma } from '../config/database';
import { generateRoomCode } from '../utils/generators';
import { serializeRoom, roomInclude, type RoomWithRelations } from '../utils/roomSerializer';
import { DEFAULT_HOUSE_RULES } from '@uno/shared';
import type { CreateRoomRequest, HouseRulesConfig, UpdateRoomSettingsRequest } from '@uno/shared';
import { MAX_PLAYERS, MIN_PLAYERS } from '@uno/shared';

export class RoomError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'ROOM_ERROR',
  ) {
    super(message);
    this.name = 'RoomError';
  }
}

async function generateUniqueRoomCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateRoomCode();
    const existing = await prisma.room.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new RoomError('Failed to generate room code', 500, 'CODE_GENERATION_FAILED');
}

export async function createRoom(hostId: string, data: CreateRoomRequest = {}) {
  const code = await generateUniqueRoomCode();
  const maxPlayers = Math.min(Math.max(data.maxPlayers ?? 4, MIN_PLAYERS), MAX_PLAYERS);
  const rules = { ...DEFAULT_HOUSE_RULES, ...data.houseRules };

  const room: RoomWithRelations = await prisma.room.create({
    data: {
      code,
      hostId,
      name: data.name ?? 'UNO Room',
      isPrivate: data.isPrivate ?? false,
      maxPlayers,
      houseRules: {
        create: {
          stackDrawTwo: rules.stackDrawTwo,
          stackWildDrawFour: rules.stackWildDrawFour,
          jumpIn: rules.jumpIn,
          sevenO: rules.sevenO,
          forcePlay: rules.forcePlay,
          drawUntilPlayable: rules.drawUntilPlayable,
          customScoreLimit: rules.customScoreLimit,
          winningScore: rules.winningScore,
          numberOfDecks: rules.numberOfDecks,
          turnTimerSeconds: rules.turnTimerSeconds,
          customRules: rules.customRules as unknown as Prisma.InputJsonValue,
        },
      },
      players: {
        create: {
          userId: hostId,
          isHost: true,
          isReady: false,
          isConnected: false,
        },
      },
    },
    include: roomInclude,
  });

  const hostPlayer = room.players[0];
  const user = await prisma.user.findUnique({ where: { id: hostId } });
  if (user && hostPlayer) {
    await prisma.roomPlayer.update({
      where: { id: hostPlayer.id },
      data: { avatarColor: user.avatarColor },
    });
  }

  const fullRoom = await prisma.room.findUniqueOrThrow({
    where: { id: room.id },
    include: roomInclude,
  });

  return serializeRoom(fullRoom);
}

export async function getRoomByCode(code: string) {
  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: roomInclude,
  });

  if (!room) {
    throw new RoomError('Room not found', 404, 'ROOM_NOT_FOUND');
  }

  return serializeRoom(room);
}

export async function getRoomById(id: string) {
  const room = await prisma.room.findUnique({
    where: { id },
    include: roomInclude,
  });

  if (!room) {
    throw new RoomError('Room not found', 404, 'ROOM_NOT_FOUND');
  }

  return serializeRoom(room);
}

export async function joinRoom(
  roomId: string,
  userId: string | null,
  guestName?: string,
) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { players: true },
  });

  if (!room) {
    throw new RoomError('Room not found', 404, 'ROOM_NOT_FOUND');
  }

  if (room.status !== 'WAITING') {
    throw new RoomError('Game already in progress', 400, 'GAME_IN_PROGRESS');
  }

  if (room.players.length >= room.maxPlayers) {
    throw new RoomError('Room is full', 400, 'ROOM_FULL');
  }

  if (userId) {
    const existing = room.players.find((p: RoomPlayer) => p.userId === userId);
    if (existing) {
      return getRoomById(roomId);
    }
  }

  let avatarColor = '#3B82F6';
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) avatarColor = user.avatarColor;
  }

  await prisma.roomPlayer.create({
    data: {
      roomId,
      userId,
      guestName: userId ? null : guestName ?? 'Guest',
      avatarColor,
      isHost: false,
      isReady: false,
      isConnected: false,
    },
  });

  return getRoomById(roomId);
}

export async function updateRoomSettings(
  roomId: string,
  hostId: string,
  settings: UpdateRoomSettingsRequest,
) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new RoomError('Room not found', 404, 'ROOM_NOT_FOUND');
  if (room.hostId !== hostId) throw new RoomError('Only host can update settings', 403, 'NOT_HOST');
  if (room.status !== 'WAITING') throw new RoomError('Cannot update during game', 400, 'GAME_IN_PROGRESS');

  await prisma.room.update({
    where: { id: roomId },
    data: {
      name: settings.name,
      isPrivate: settings.isPrivate,
      maxPlayers: settings.maxPlayers
        ? Math.min(Math.max(settings.maxPlayers, MIN_PLAYERS), MAX_PLAYERS)
        : undefined,
      allowSpectators: settings.allowSpectators,
    },
  });

  return getRoomById(roomId);
}

export async function updateHouseRules(
  roomId: string,
  hostId: string,
  rules: Partial<HouseRulesConfig>,
) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new RoomError('Room not found', 404, 'ROOM_NOT_FOUND');
  if (room.hostId !== hostId) throw new RoomError('Only host can update rules', 403, 'NOT_HOST');
  if (room.status !== 'WAITING') throw new RoomError('Cannot update during game', 400, 'GAME_IN_PROGRESS');

  await prisma.houseRules.upsert({
    where: { roomId },
    create: {
      roomId,
      stackDrawTwo: rules.stackDrawTwo ?? false,
      stackWildDrawFour: rules.stackWildDrawFour ?? false,
      jumpIn: rules.jumpIn ?? false,
      sevenO: rules.sevenO ?? false,
      forcePlay: rules.forcePlay ?? false,
      drawUntilPlayable: rules.drawUntilPlayable ?? false,
      customScoreLimit: rules.customScoreLimit ?? 0,
      winningScore: rules.winningScore ?? 500,
      numberOfDecks: rules.numberOfDecks ?? 1,
      turnTimerSeconds: rules.turnTimerSeconds ?? 30,
      customRules: (rules.customRules ?? []) as unknown as Prisma.InputJsonValue,
    },
    update: {
      stackDrawTwo: rules.stackDrawTwo,
      stackWildDrawFour: rules.stackWildDrawFour,
      jumpIn: rules.jumpIn,
      sevenO: rules.sevenO,
      forcePlay: rules.forcePlay,
      drawUntilPlayable: rules.drawUntilPlayable,
      customScoreLimit: rules.customScoreLimit,
      winningScore: rules.winningScore,
      numberOfDecks: rules.numberOfDecks,
      turnTimerSeconds: rules.turnTimerSeconds,
      customRules: rules.customRules as unknown as Prisma.InputJsonValue,
    },
  });

  return getRoomById(roomId);
}

export async function kickPlayer(roomId: string, hostId: string, playerId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new RoomError('Room not found', 404, 'ROOM_NOT_FOUND');
  if (room.hostId !== hostId) throw new RoomError('Only host can kick players', 403, 'NOT_HOST');

  const player = await prisma.roomPlayer.findUnique({ where: { id: playerId } });
  if (!player || player.roomId !== roomId) {
    throw new RoomError('Player not found', 404, 'PLAYER_NOT_FOUND');
  }
  if (player.isHost) throw new RoomError('Cannot kick the host', 400, 'CANNOT_KICK_HOST');

  await prisma.roomPlayer.delete({ where: { id: playerId } });
  return getRoomById(roomId);
}

export async function setPlayerReady(playerId: string, isReady: boolean) {
  await prisma.roomPlayer.update({
    where: { id: playerId },
    data: { isReady },
  });
}

export async function setPlayerConnected(playerId: string, connected: boolean, socketId?: string) {
  await prisma.roomPlayer.update({
    where: { id: playerId },
    data: { isConnected: connected, socketId: connected ? socketId : null },
  });
}

export async function updatePlayerPing(playerId: string, ping: number) {
  await prisma.roomPlayer.update({
    where: { id: playerId },
    data: { ping },
  });
}

export async function addSystemMessage(roomId: string, content: string) {
  return prisma.message.create({
    data: {
      roomId,
      senderName: 'System',
      content,
      type: 'SYSTEM',
    },
  });
}

export async function addChatMessage(
  roomId: string,
  senderId: string | null,
  senderName: string,
  content: string,
) {
  return prisma.message.create({
    data: {
      roomId,
      senderId,
      senderName,
      content,
      type: 'USER',
    },
  });
}

export async function getChatHistory(roomId: string, limit = 50) {
  return prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}
