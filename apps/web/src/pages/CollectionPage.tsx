import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { collectionApi, type GachaItem } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const RARITY_STYLE: Record<string, { border: string; glow: string; label: string; bg: string }> = {
  R:   { border: 'border-blue-400/40',   glow: '',                                         label: 'text-blue-300',  bg: 'bg-blue-900/20' },
  SR:  { border: 'border-purple-400/50', glow: 'shadow-[0_0_10px_rgba(192,132,252,0.3)]',  label: 'text-purple-300', bg: 'bg-purple-900/20' },
  SSR: { border: 'border-[#ffd700]/70',  glow: 'shadow-[0_0_16px_rgba(255,215,0,0.4)]',   label: 'text-[#ffd700]',  bg: 'bg-yellow-900/20' },
};

const ITEM_TYPE_ICON: Record<string, string> = {
  card_skin:   '🃏',
  avatar:      '👤',
  table_theme: '🎰',
};

type FilterRarity = 'all' | 'R' | 'SR' | 'SSR';
type FilterType   = 'all' | 'card_skin' | 'avatar' | 'table_theme';

function CollectionCard({ item, index }: { item: GachaItem; index: number }) {
  const s = RARITY_STYLE[item.rarity];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 ${s.border} ${s.glow} ${s.bg} p-4 w-28 h-40`}
    >
      <span className={`absolute top-1.5 right-2 font-cinzel text-xs font-bold ${s.label}`}>
        {item.rarity}
      </span>
      <span className="text-4xl mb-2">{ITEM_TYPE_ICON[item.type] ?? '✨'}</span>
      <p className="font-cinzel text-white text-xs text-center leading-tight">{item.name}</p>
      <p className="text-white/40 text-[10px] text-center mt-1 capitalize">{item.type.replace('_', ' ')}</p>
    </motion.div>
  );
}

export default function CollectionPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [rarityFilter, setRarityFilter] = useState<FilterRarity>('all');
  const [typeFilter,   setTypeFilter]   = useState<FilterType>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['collection'],
    queryFn: collectionApi.list,
  });

  const items = (data?.items ?? []).filter(
    (i) =>
      (rarityFilter === 'all' || i.rarity === rarityFilter) &&
      (typeFilter   === 'all' || i.type   === typeFilter),
  );

  const counts = { R: 0, SR: 0, SSR: 0 };
  (data?.items ?? []).forEach((i) => { counts[i.rarity] = (counts[i.rarity] ?? 0) + 1; });

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
        <h1 className="font-cinzel text-2xl font-bold text-[#ffd700]">📦 COLLECTION</h1>
        <div className="font-mono text-[#ffd700] text-sm">
          ◈ {(user?.chips ?? 0).toLocaleString()}
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        {/* Stats */}
        <div className="flex gap-4 mb-6">
          {(['R', 'SR', 'SSR'] as const).map((r) => {
            const s = RARITY_STYLE[r];
            return (
              <div key={r} className={`border ${s.border} rounded-lg px-4 py-2 text-center`}>
                <p className={`font-cinzel font-bold text-lg ${s.label}`}>{counts[r]}</p>
                <p className="text-white/50 text-xs">{r}</p>
              </div>
            );
          })}
          <div className="border border-white/20 rounded-lg px-4 py-2 text-center">
            <p className="font-cinzel font-bold text-lg text-white">{data?.items.length ?? 0}</p>
            <p className="text-white/50 text-xs">Total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'R', 'SR', 'SSR'] as FilterRarity[]).map((r) => (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className={`font-cinzel text-xs uppercase px-3 py-1 rounded-full border transition-colors ${
                rarityFilter === r
                  ? 'bg-[#ffd700] border-[#ffd700] text-[#0f0c29] font-bold'
                  : 'border-white/20 text-white/60 hover:border-white/50 hover:text-white'
              }`}
            >
              {r === 'all' ? 'All Rarity' : r}
            </button>
          ))}
          <span className="text-white/20 self-center">|</span>
          {(['all', 'card_skin', 'avatar', 'table_theme'] as FilterType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`font-cinzel text-xs uppercase px-3 py-1 rounded-full border transition-colors ${
                typeFilter === t
                  ? 'bg-white/20 border-white/60 text-white font-bold'
                  : 'border-white/20 text-white/60 hover:border-white/50 hover:text-white'
              }`}
            >
              {t === 'all' ? 'All Types' : t.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-white/50 font-cinzel tracking-widest">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-4">
            <p className="text-white/40 font-cinzel tracking-widest text-lg">
              {(data?.items.length ?? 0) === 0 ? 'No items yet — try the Gacha!' : 'No items match filters'}
            </p>
            {(data?.items.length ?? 0) === 0 && (
              <button
                onClick={() => navigate('/gacha')}
                className="bg-[#ffd700] text-[#0f0c29] font-cinzel font-bold px-8 py-3 rounded-xl text-sm"
              >
                ✨ Go Pull
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {items.map((item, i) => (
              <CollectionCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
