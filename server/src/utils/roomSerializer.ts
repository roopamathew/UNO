import type { HouseRules } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { CustomRule, HouseRulesConfig, Room as RoomDTO, RoomPlayer as RoomPlayerDTO } from '@uno/shared';

export const roomInclude = {
  players: {
    include: { user: { select: { username: true, avatarUrl: true } } },
    orderBy: { joinedAt: 'asc' as const },
  },
  houseRules: true,
};

export type RoomWithRelations = Prisma.RoomGetPayload<{ include: typeof roomInclude }>;

export function serializeHouseRules(rules: HouseRules | null): HouseRulesConfig {
  if (!rules) {
    return {
      stackDrawTwo: false,
      stackWildDrawFour: false,
      jumpIn: false,
      sevenO: false,
      forcePlay: false,
      drawUntilPlayable: false,
      customScoreLimit: 0,
      winningScore: 500,
      numberOfDecks: 1,
      turnTimerSeconds: 30,
      customRules: [],
    };
  }

  return {
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
    customRules: (rules.customRules as unknown as CustomRule[]) ?? [],
  };
}

export function serializeRoomPlayer(player: RoomWithRelations['players'][0]): RoomPlayerDTO {
  return {
    id: player.id,
    userId: player.userId,
    username: player.user?.username ?? player.guestName ?? 'Guest',
    avatarUrl: player.user?.avatarUrl ?? player.avatarUrl,
    avatarColor: player.avatarColor,
    isHost: player.isHost,
    isReady: player.isReady,
    isConnected: player.isConnected,
    ping: player.ping,
    joinedAt: player.joinedAt.toISOString(),
  };
}

export function serializeRoom(room: RoomWithRelations): RoomDTO {
  return {
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    settings: {
      isPrivate: room.isPrivate,
      maxPlayers: room.maxPlayers,
      allowSpectators: room.allowSpectators,
      name: room.name,
    },
    houseRules: serializeHouseRules(room.houseRules),
    players: room.players.map(serializeRoomPlayer),
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}
