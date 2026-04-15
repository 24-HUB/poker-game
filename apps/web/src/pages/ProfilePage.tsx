import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { usersApi, type UserProfile } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const RARITY_COLORS: Record<string, string> = {
  R:   'text-blue-300',
  SR:  'text-purple-300',
  SSR: 'text-[#ffd700]',
};

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: self } = useAuthStore();

  const profileId = id ?? self?.id ?? '';

  const { data, isLoading, isError } = useQuery<UserProfile>({
    queryKey: ['profile', profileId],
    queryFn: () => usersApi.getProfile(profileId),
    enabled: !!profileId,
  });

  const isSelf = profileId === self?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <p className="font-cinzel text-white/50 tracking-widest">Loading…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col items-center justify-center gap-4">
        <p className="font-cinzel text-red-400 text-lg">Player not found</p>
        <button onClick={() => navigate(-1)} className="font-cinzel text-white/60 hover:text-white text-sm">
          ← Go back
        </button>
      </div>
    );
  }

  const { user: profile, stats } = data;
  const winRate = stats.handsPlayed > 0 ? Math.round((stats.wins / stats.handsPlayed) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-white/60 hover:text-white font-cinzel text-sm transition-colors"
        >
          ← Back
        </button>
        <h1 className="font-cinzel text-2xl font-bold text-[#ffd700]">
          {isSelf ? 'MY PROFILE' : 'PLAYER PROFILE'}
        </h1>
        <div className="w-24" />
      </header>

      <main className="flex-1 px-4 py-10 max-w-xl mx-auto w-full flex flex-col items-center gap-8">
        {/* Avatar + name */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-[#ffd700]/40 flex items-center justify-center text-5xl text-white/60 shadow-[0_0_24px_rgba(255,215,0,0.15)]">
            {profile.username[0].toUpperCase()}
          </div>
          <h2 className="font-cinzel text-3xl font-bold text-white">{profile.username}</h2>
          <div className="flex items-center gap-2 font-jetbrains text-[#ffd700] text-lg">
            <span>◈</span>
            <span>{(profile.chips ?? 1000).toLocaleString()}</span>
            <span className="text-white/30 text-sm">chips</span>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 w-full"
        >
          {[
            { label: 'Wins', value: stats.wins },
            { label: 'Hands', value: stats.handsPlayed },
            { label: 'Win Rate', value: `${winRate}%` },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl py-5"
            >
              <p className="font-jetbrains text-2xl font-bold text-white">{value}</p>
              <p className="font-cinzel text-white/40 text-xs uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Collection count */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 flex items-center justify-between"
        >
          <span className="font-cinzel text-white/60 text-sm uppercase tracking-wider">Collection</span>
          <span className="font-jetbrains text-xl font-bold text-[#ffd700]">
            {stats.collectionCount} items
          </span>
        </motion.div>

        {/* Action buttons for own profile */}
        {isSelf && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex gap-4 w-full"
          >
            <button
              onClick={() => navigate('/gacha')}
              className="flex-1 bg-[#ffd700]/20 hover:bg-[#ffd700]/30 border border-[#ffd700]/60 text-[#ffd700] font-cinzel font-bold py-3 rounded-xl transition-colors text-sm"
            >
              ✨ Gacha Pull
            </button>
            <button
              onClick={() => navigate('/collection')}
              className="flex-1 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-cinzel font-bold py-3 rounded-xl transition-colors text-sm"
            >
              📦 Collection
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
