import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, parseExpiresIn, verifyRefreshToken } from '../utils/jwt';
import { generateSecureToken } from '../utils/generators';
import { toUserProfile, toDefaultSettings } from '../utils/serializers';
import { env } from '../config/env';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@uno/shared';
import { AVATAR_COLORS } from '@uno/shared';

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'AUTH_ERROR',
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

async function createTokens(user: { id: string; email: string; username: string }): Promise<AuthResponse> {
  const payload = { userId: user.id, email: user.email, username: user.username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: parseExpiresIn(env.JWT_REFRESH_EXPIRES),
    },
  });

  const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  return {
    user: toUserProfile(fullUser),
    tokens: { accessToken, refreshToken },
  };
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email.toLowerCase() }, { username: data.username }] },
  });

  if (existing) {
    if (existing.email === data.email.toLowerCase()) {
      throw new AuthError('Email already registered', 409, 'EMAIL_EXISTS');
    }
    throw new AuthError('Username already taken', 409, 'USERNAME_EXISTS');
  }

  const passwordHash = await hashPassword(data.password);
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const newUser = await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username,
        passwordHash,
        avatarColor,
      },
    });

    await tx.userSettings.create({ data: toDefaultSettings(newUser.id) });
    await tx.userStats.create({ data: { userId: newUser.id } });

    return newUser;
  });

  return createTokens(user);
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (!user || !user.passwordHash) {
    throw new AuthError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await comparePassword(data.password, user.passwordHash);
  if (!valid) {
    throw new AuthError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  return createTokens(user);
}

export async function refreshTokens(token: string): Promise<AuthResponse> {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AuthError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AuthError('Refresh token expired', 401, 'TOKEN_EXPIRED');
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
  }

  return createTokens(user);
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

export async function forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user) {
    return { message: 'If an account exists, a reset link has been sent.' };
  }

  const token = generateSecureToken();
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  // In production, send email. For dev, return token.
  const result: { message: string; resetToken?: string } = {
    message: 'If an account exists, a reset link has been sent.',
  };

  if (env.NODE_ENV === 'development') {
    result.resetToken = token;
  }

  return result;
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const reset = await prisma.passwordReset.findUnique({ where: { token } });

  if (!reset || reset.used || reset.expiresAt < new Date()) {
    throw new AuthError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: reset.id },
      data: { used: true },
    }),
  ]);
}

export async function findOrCreateGoogleUser(profile: {
  googleId: string;
  email: string;
  username: string;
  avatarUrl?: string;
}): Promise<AuthResponse> {
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: profile.googleId }, { email: profile.email.toLowerCase() }] },
  });

  if (user) {
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId, authProvider: 'GOOGLE', emailVerified: true },
      });
    }
  } else {
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          email: profile.email.toLowerCase(),
          username: profile.username,
          googleId: profile.googleId,
          avatarUrl: profile.avatarUrl,
          avatarColor,
          authProvider: 'GOOGLE',
          emailVerified: true,
        },
      });

      await tx.userSettings.create({ data: toDefaultSettings(newUser.id) });
      await tx.userStats.create({ data: { userId: newUser.id } });

      return newUser;
    });
  }

  return createTokens(user);
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true, stats: true },
  });

  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
  }

  return {
    user: toUserProfile(user),
    stats: user.stats
      ? {
          userId: user.stats.userId,
          wins: user.stats.wins,
          losses: user.stats.losses,
          gamesPlayed: user.stats.gamesPlayed,
          winRate: user.stats.gamesPlayed > 0 ? (user.stats.wins / user.stats.gamesPlayed) * 100 : 0,
          totalPoints: user.stats.totalPoints,
          averageScore: user.stats.gamesPlayed > 0 ? user.stats.totalPoints / user.stats.gamesPlayed : 0,
          longestWinStreak: user.stats.longestWinStreak,
          currentWinStreak: user.stats.currentWinStreak,
        }
      : null,
    settings: user.settings,
  };
}
