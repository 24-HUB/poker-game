import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gachaApi, type GachaItem } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const RARITY_STYLE: Record<string, { border: string; glow: string; label: string }> = {
  R:   { border: 'border-blue-400/60',   glow: 'shadow-[0_0_12px_rgba(96,165,250,0.5)]',   label: 'text-blue-300' },
  SR:  { border: 'border-purple-400/60', glow: 'shadow-[0_0_16px_rgba(192,132,252,0.6)]',  label: 'text-purple-300' },
  SSR: { border: 'border-[#ffd700]/80',  glow: 'shadow-[0_0_24px_rgba(255,215,0,0.7)]',   label: 'text-[#ffd700]' },
};

const ITEM_TYPE_ICON: Record<string, string> = {
  card_skin:   '🃏',
  avatar:      '👤',
  table_theme: '🎰',
};

function ItemCard({ item, delay = 0 }: { item: GachaItem; delay?: number }) {
  const s = RARITY_STYLE[item.rarity];
  return (
    <motion.div
      initial={{ scale: 0, rotateY: 180, opacity: 0 }}
      animate={{ scale: 1, rotateY: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5, type: 'spring', stiffness: 200 }}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 ${s.border} ${s.glow} bg-white/5 p-4 w-28 h-40 cursor-default`}
    >
      {/* Rarity badge */}
      <span className={`absolute top-1.5 right-2 font-cinzel text-xs font-bold ${s.label}`}>
        {item.rarity}
      </span>
      {/* Type icon */}
      <span className="text-4xl mb-2">{ITEM_TYPE_ICON[item.type] ?? '✨'}</span>
      <p className="font-cinzel text-white text-xs text-center leading-tight">{item.name}</p>
      <p className="text-white/40 text-[10px] text-center mt-1 capitalize">{item.type.replace('_', ' ')}</p>
    </motion.div>
  );
}

export default function GachaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, updateChips } = useAuthStore();
  const [results, setResults] = useState<GachaItem[] | null>(null);
  const [pulling, setPulling] = useState(false);

  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: gachaApi.banners,
  });

  const banner = banners?.[0];

  const { mutate: pull } = useMutation({
    mutationFn: (count: 1 | 10) => gachaApi.pull(count),
    onMutate: () => setPulling(true),
    onSuccess: (data) => {
      setPulling(false);
      setResults(data.items);
      updateChips(data.chips);
      qc.invalidateQueries({ queryKey: ['collection'] });
    },
    onError: (err: Error) => {
      setPulling(false);
      alert(err.message);
    },
  });

  const hasFunds1  = (user?.chips ?? 0) >= 150;
  const hasFunds10 = (user?.chips ?? 0) >= 1350;

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
        <h1 className="font-cinzel text-2xl font-bold text-[#ffd700]">✨ GACHA PULL</h1>
        <div className="font-mono text-[#ffd700] text-sm">
          ◈ {(user?.chips ?? 0).toLocaleString()}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start py-10 px-4 gap-8">
        {/* Banner Info */}
        {banner && (
          <div className="text-center max-w-lg">
            <h2 className="font-cinzel text-3xl font-bold text-white mb-1">{banner.name}</h2>
            <p className="text-white/50 text-sm">{banner.description}</p>
            <div className="flex justify-center gap-4 mt-3 text-xs font-mono">
              <span className="text-blue-300">R {(banner.rates.R * 100).toFixed(0)}%</span>
              <span className="text-purple-300">SR {(banner.rates.SR * 100).toFixed(0)}%</span>
              <span className="text-[#ffd700]">SSR {(banner.rates.SSR * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Pull buttons */}
        <div className="flex gap-4">
          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={!hasFunds1 || pulling}
            onClick={() => pull(1)}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-cinzel font-bold px-8 py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            × 1 Pull
            <span className="block text-[#ffd700] text-xs font-mono mt-0.5">◈ 150</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={!hasFunds10 || pulling}
            onClick={() => pull(10)}
            className="bg-[#ffd700]/20 hover:bg-[#ffd700]/30 border border-[#ffd700]/60 text-[#ffd700] font-cinzel font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_20px_rgba(255,215,0,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            × 10 Pull
            <span className="block text-white/60 text-xs font-mono mt-0.5">◈ 1,350</span>
          </motion.button>
        </div>

        {/* Pulling spinner */}
        <AnimatePresence>
          {pulling && (
            <motion.div
              key="spinner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-12 h-12 border-4 border-[#ffd700]/30 border-t-[#ffd700] rounded-full"
              />
              <p className="font-cinzel text-[#ffd700]/70 text-sm tracking-widest">PULLING…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results && !pulling && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
                {results.map((item, i) => (
                  <ItemCard key={`${item.id}-${i}`} item={item} delay={i * 0.08} />
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setResults(null)}
                  className="font-cinzel text-white/60 hover:text-white text-sm border border-white/20 px-6 py-2 rounded-lg transition-colors"
                >
                  Pull Again
                </button>
                <button
                  onClick={() => navigate('/collection')}
                  className="font-cinzel text-[#ffd700] hover:text-white text-sm border border-[#ffd700]/40 hover:border-[#ffd700] px-6 py-2 rounded-lg transition-colors"
                >
                  My Collection →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
