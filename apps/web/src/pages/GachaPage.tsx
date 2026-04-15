import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gachaApi, type GachaItem } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const RARITY_STYLE: Record<string, { border: string; glow: string; label: string; ring: string }> = {
  R:   { border: 'border-blue-400/60',   glow: 'shadow-[0_0_12px_rgba(96,165,250,0.5)]',   label: 'text-blue-300',   ring: 'rgba(96,165,250,0.6)' },
  SR:  { border: 'border-purple-400/60', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.7)]',  label: 'text-purple-300', ring: 'rgba(192,132,252,0.7)' },
  SSR: { border: 'border-[#ffd700]/80',  glow: 'shadow-[0_0_32px_rgba(255,215,0,0.8)]',   label: 'text-[#ffd700]',  ring: 'rgba(255,215,0,0.8)' },
};

const ITEM_TYPE_ICON: Record<string, string> = {
  card_skin:   '🃏',
  avatar:      '👤',
  table_theme: '🎰',
};

// Portal ring animation component
const PortalRing: React.FC<{ radius: number; duration: number; color: string; clockwise?: boolean }> = ({
  radius, duration, color, clockwise = true,
}) => (
  <motion.div
    animate={{ rotate: clockwise ? 360 : -360 }}
    transition={{ repeat: Infinity, duration, ease: 'linear' }}
    className="absolute rounded-full border-2"
    style={{
      width: radius * 2,
      height: radius * 2,
      borderColor: color,
      borderStyle: 'dashed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
    }}
  />
);

function ItemCard({ item, delay = 0 }: { item: GachaItem; delay?: number }) {
  const s = RARITY_STYLE[item.rarity];
  const isSSR = item.rarity === 'SSR';
  return (
    <motion.div
      initial={{ scale: 0, rotateY: 180, opacity: 0 }}
      animate={{ scale: 1, rotateY: 0, opacity: 1 }}
      transition={{ delay, duration: 0.55, type: 'spring', stiffness: 180 }}
      style={{ perspective: '600px' }}
    >
      <motion.div
        animate={isSSR ? { boxShadow: ['0 0 16px rgba(255,215,0,0.4)', '0 0 40px rgba(255,215,0,0.9)', '0 0 16px rgba(255,215,0,0.4)'] } : {}}
        transition={isSSR ? { repeat: Infinity, duration: 1.5 } : {}}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 ${s.border} ${s.glow} bg-white/5 p-4 w-28 h-40 cursor-default overflow-hidden`}
      >
        {/* SSR sparkle overlay */}
        {isSSR && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-[#ffd700]/10 via-transparent to-[#ffd700]/10"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
        <span className={`absolute top-1.5 right-2 font-cinzel text-xs font-bold ${s.label}`}>
          {item.rarity}
        </span>
        <span className="text-4xl mb-2 relative z-10">{ITEM_TYPE_ICON[item.type] ?? '✨'}</span>
        <p className="font-cinzel text-white text-xs text-center leading-tight relative z-10">{item.name}</p>
        <p className="text-white/40 text-[10px] text-center mt-1 capitalize relative z-10">{item.type.replace('_', ' ')}</p>
      </motion.div>
    </motion.div>
  );
}

export default function GachaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, updateChips } = useAuthStore();
  const [results, setResults] = useState<GachaItem[] | null>(null);
  const [pulling, setPulling] = useState(false);
  // portal = show swirl; revealReady = data arrived, wait for portal exit before showing cards
  const [showPortal, setShowPortal] = useState(false);
  const pendingResults = useRef<GachaItem[] | null>(null);

  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: gachaApi.banners,
  });

  const banner = banners?.[0];

  const { mutate: pull } = useMutation({
    mutationFn: (count: 1 | 10) => gachaApi.pull(count),
    onMutate: () => {
      setPulling(true);
      setResults(null);
      setShowPortal(true);
      pendingResults.current = null;
    },
    onSuccess: (data) => {
      updateChips(data.chips);
      qc.invalidateQueries({ queryKey: ['collection'] });
      pendingResults.current = data.items;
      // Hold portal for at least 1.2 s so the swirl feels dramatic
      setTimeout(() => {
        setShowPortal(false);
        setResults(pendingResults.current);
        setPulling(false);
      }, 1200);
    },
    onError: (err: Error) => {
      setPulling(false);
      setShowPortal(false);
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

        {/* Portal swirl overlay */}
        <AnimatePresence>
          {showPortal && (
            <motion.div
              key="portal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-black/80"
            >
              <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
                {/* Rings */}
                <PortalRing radius={60}  duration={1.2} color="rgba(255,215,0,0.7)"   clockwise={true} />
                <PortalRing radius={100} duration={1.9} color="rgba(192,132,252,0.55)" clockwise={false} />
                <PortalRing radius={145} duration={3.0} color="rgba(96,165,250,0.4)"   clockwise={true} />

                {/* Center glow */}
                <motion.div
                  animate={{ scale: [1, 1.35, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-24 h-24 rounded-full bg-[#ffd700]/15 blur-2xl"
                />
                <motion.div
                  animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute w-10 h-10 rounded-full bg-[#ffd700]/40"
                />

                {/* Label */}
                <p className="absolute font-cinzel text-[#ffd700] tracking-[0.25em] text-sm"
                   style={{ top: '50%', transform: 'translateY(70px)' }}>
                  {pulling ? 'SUMMONING…' : 'REVEALED!'}
                </p>
              </div>
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
