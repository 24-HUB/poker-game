import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { leaderboardApi, type LeaderboardEntry } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const RANK_STYLE: Record<number, string> = {
  1: 'text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.7)]',
  2: 'text-slate-300',
  3: 'text-amber-600',
};

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return <span className="text-xl">{MEDAL[rank]}</span>;
  }
  return (
    <span className="font-jetbrains text-white/40 text-sm w-6 text-right">{rank}</span>
  );
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: leaderboardApi.top50,
    refetchInterval: 30_000,
  });

  const entries = data?.leaderboard ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/lobby')}
          className="text-white/60 hover:text-white font-cinzel text-sm transition-colors"
        >
          ← Back to Lobby
        </button>
        <h1 className="font-cinzel text-2xl font-bold text-[#ffd700]">🏆 LEADERBOARD</h1>
        <div className="font-mono text-[#ffd700] text-sm">
          ◈ {(user?.chips ?? 0).toLocaleString()}
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-white/50 font-cinzel tracking-widest">
            Loading…
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-60 text-white/30 font-cinzel tracking-widest">
            No players yet — start a game!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry: LeaderboardEntry, i: number) => {
              const rank = i + 1;
              const isSelf = entry.id === user?.id;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/profile/${entry.id}`)}
                  className={`flex items-center gap-4 px-5 py-3 rounded-xl border cursor-pointer transition-colors
                    ${isSelf
                      ? 'border-[#ffd700]/60 bg-[#ffd700]/10 hover:bg-[#ffd700]/15'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center">
                    <RankBadge rank={rank} />
                  </div>

                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/50 text-lg flex-shrink-0">
                    {entry.username[0].toUpperCase()}
                  </div>

                  {/* Name + stats */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-cinzel font-bold truncate ${isSelf ? 'text-[#ffd700]' : 'text-white'}`}>
                      {entry.username}
                      {isSelf && <span className="text-xs font-normal text-[#ffd700]/60 ml-2">(you)</span>}
                    </p>
                    <p className="text-white/40 font-jetbrains text-xs">
                      {entry.wins}W / {entry.handsPlayed}P
                      {entry.handsPlayed > 0 &&
                        ` · ${Math.round((entry.wins / entry.handsPlayed) * 100)}% WR`}
                    </p>
                  </div>

                  {/* Chips */}
                  <div className={`font-jetbrains font-bold text-right ${RANK_STYLE[rank] ?? 'text-white/80'}`}>
                    ◈ {entry.chips.toLocaleString()}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
