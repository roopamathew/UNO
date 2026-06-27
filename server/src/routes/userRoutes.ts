import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { formatUserSettings } from '../utils/serializers';

const router = Router();

router.get('/stats', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const stats = await prisma.userStats.findUnique({
      where: { userId: req.authUser!.userId },
    });

    if (!stats) {
      res.json(null);
      return;
    }

    res.json({
      userId: stats.userId,
      wins: stats.wins,
      losses: stats.losses,
      gamesPlayed: stats.gamesPlayed,
      winRate: stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0,
      totalPoints: stats.totalPoints,
      averageScore: stats.gamesPlayed > 0 ? stats.totalPoints / stats.gamesPlayed : 0,
      longestWinStreak: stats.longestWinStreak,
      currentWinStreak: stats.currentWinStreak,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/settings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.authUser!.userId },
    });

    res.json(settings ? formatUserSettings(settings) : null);
  } catch (err) {
    next(err);
  }
});

router.patch('/settings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const settings = await prisma.userSettings.update({
      where: { userId: req.authUser!.userId },
      data: req.body,
    });

    res.json(formatUserSettings(settings));
  } catch (err) {
    next(err);
  }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    const period = (req.query.period as string) ?? 'all-time';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const since =
      period === 'weekly'
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : period === 'monthly'
          ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          : null;

    if (since) {
      const gamePlayers = await prisma.gamePlayer.findMany({
        where: {
          userId: { not: null },
          game: { status: 'COMPLETED', endedAt: { gte: since } },
        },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, avatarColor: true } },
        },
      });

      const aggregated = new Map<
        string,
        {
          userId: string;
          username: string;
          avatarUrl: string | null;
          avatarColor: string;
          wins: number;
          totalPoints: number;
          gamesPlayed: number;
        }
      >();

      for (const gp of gamePlayers) {
        if (!gp.userId || !gp.user) continue;
        const existing = aggregated.get(gp.userId) ?? {
          userId: gp.userId,
          username: gp.user.username,
          avatarUrl: gp.user.avatarUrl,
          avatarColor: gp.user.avatarColor,
          wins: 0,
          totalPoints: 0,
          gamesPlayed: 0,
        };
        existing.gamesPlayed += 1;
        existing.totalPoints += gp.score;
        if (gp.isWinner) existing.wins += 1;
        aggregated.set(gp.userId, existing);
      }

      const sorted = [...aggregated.values()]
        .sort((a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints)
        .slice(0, limit);

      const leaderboard = sorted.map((s, index) => ({
        rank: index + 1,
        userId: s.userId,
        username: s.username,
        avatarUrl: s.avatarUrl,
        avatarColor: s.avatarColor,
        wins: s.wins,
        totalPoints: s.totalPoints,
        gamesPlayed: s.gamesPlayed,
        winRate: s.gamesPlayed > 0 ? (s.wins / s.gamesPlayed) * 100 : 0,
        pointsToNext:
          index > 0 ? Math.max(0, sorted[index - 1].totalPoints - s.totalPoints + 1) : undefined,
      }));

      res.json({ period, entries: leaderboard });
      return;
    }

    const stats = await prisma.userStats.findMany({
      take: limit,
      orderBy: [{ wins: 'desc' }, { totalPoints: 'desc' }],
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, avatarColor: true } },
      },
    });

    const leaderboard = stats.map((s, index) => ({
      rank: index + 1,
      userId: s.userId,
      username: s.user.username,
      avatarUrl: s.user.avatarUrl,
      avatarColor: s.user.avatarColor,
      wins: s.wins,
      totalPoints: s.totalPoints,
      gamesPlayed: s.gamesPlayed,
      winRate: s.gamesPlayed > 0 ? (s.wins / s.gamesPlayed) * 100 : 0,
      pointsToNext:
        index > 0 ? Math.max(0, stats[index - 1].totalPoints - s.totalPoints + 1) : undefined,
    }));

    res.json({ period, entries: leaderboard });
  } catch (err) {
    next(err);
  }
});

export default router;
