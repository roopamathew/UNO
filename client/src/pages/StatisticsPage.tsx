import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthStore } from '@/stores/authStore';
import { userApi, type LeaderboardEntry } from '@/services/userApi';
import { formatWinRate } from '@/utils/helpers';

interface UserStats {
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
  totalPoints: number;
  averageScore: number;
  longestWinStreak: number;
  currentWinStreak: number;
}

export function StatisticsPage() {
  const { tokens, isAuthenticated, user } = useAuthStore();
  const [period, setPeriod] = useState<'all-time' | 'weekly' | 'monthly'>('all-time');

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => userApi.getStats(tokens!.accessToken) as Promise<UserStats>,
    enabled: isAuthenticated,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => userApi.getLeaderboard(period),
  });

  const myEntry = leaderboard?.entries.find((e) => e.userId === user?.id);
  const playerAbove =
    myEntry && myEntry.rank > 1
      ? leaderboard?.entries.find((e) => e.rank === myEntry.rank - 1)
      : undefined;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold mb-8">Statistics</h1>

      {isAuthenticated && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Wins', value: stats.wins, color: 'text-green-400' },
            { label: 'Losses', value: stats.losses, color: 'text-red-400' },
            { label: 'Win Rate', value: formatWinRate(stats.wins, stats.gamesPlayed), color: 'text-uno-yellow' },
            { label: 'Games', value: stats.gamesPlayed, color: 'text-uno-blue' },
            { label: 'Total Points', value: stats.totalPoints, color: 'text-white' },
            { label: 'Avg Score', value: stats.averageScore.toFixed(0), color: 'text-white' },
            { label: 'Best Streak', value: stats.longestWinStreak, color: 'text-uno-wild' },
            { label: 'Current Streak', value: stats.currentWinStreak, color: 'text-uno-red' },
          ].map((stat) => (
            <GlassCard key={stat.label} className="text-center">
              <p className="text-sm text-white/40 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {isAuthenticated && myEntry && playerAbove && myEntry.pointsToNext !== undefined && (
        <GlassCard className="mb-8 text-center">
          <p className="text-white/70">
            You need <span className="text-uno-yellow font-bold">{myEntry.pointsToNext}</span> more
            points to overtake <span className="font-semibold">{playerAbove.username}</span> (#{playerAbove.rank})
          </p>
        </GlassCard>
      )}

      {!isAuthenticated && (
        <GlassCard className="mb-8 text-center">
          <p className="text-white/50">Sign in to track your personal statistics</p>
        </GlassCard>
      )}

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Leaderboard</h2>
          <div className="flex gap-1">
            {(['all-time', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${
                  period === p ? 'bg-uno-red/20 text-uno-red' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {p.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
        {leaderboard?.entries.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 border-b border-white/10">
                  <th className="text-left py-3 px-2">Rank</th>
                  <th className="text-left py-3 px-2">Player</th>
                  <th className="text-right py-3 px-2">Wins</th>
                  <th className="text-right py-3 px-2">Score</th>
                  <th className="text-right py-3 px-2">Games</th>
                  <th className="text-right py-3 px-2">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.map((entry: LeaderboardEntry) => (
                  <tr key={entry.userId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-2 font-bold">#{entry.rank}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: entry.avatarColor }}
                        >
                          {entry.username[0]}
                        </div>
                        {entry.username}
                        {entry.userId === user?.id && (
                          <span className="text-xs text-uno-red">(you)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">{entry.wins}</td>
                    <td className="py-3 px-2 text-right">{entry.totalPoints}</td>
                    <td className="py-3 px-2 text-right">{entry.gamesPlayed}</td>
                    <td className="py-3 px-2 text-right">{entry.winRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-white/40 text-center py-8">No players on the leaderboard yet. Be the first!</p>
        )}
      </GlassCard>
    </div>
  );
}
