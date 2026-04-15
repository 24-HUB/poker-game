import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { historyApi, type GameHistoryEntry } from '../lib/api';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function EntryRow({ entry }: { entry: GameHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);

  const winnerNames = entry.winners.map((w) => {
    const found = entry.playerSummary.find((p) => p.id === w.playerId);
    return found ? found.username : w.playerId.slice(0, 6);
  });

  const topWinner = entry.winners[0];
  const topWinnerName = winnerNames[0] ?? '—';

  return (
    <motion.div
      layout
      className="border border-white/10 rounded-xl overflow-hidden bg-white/5 hover:bg-white/8 transition-colors"
    >
      {/* Summary row */}
      <button
        className="w-full text-left px-5 py-4 flex items-center gap-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-2xl select-none">🃏</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-cinzel text-white text-sm font-semibold">
              Round #{entry.roundNumber}
            </span>
            <span className="text-white/30 text-xs">·</span>
            <span className="text-white/40 text-xs truncate max-w-[120px]">
              Room {entry.roomId.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[#ffd700] text-xs font-mono">◈ {entry.pot.toLocaleString()}</span>
            <span className="text-white/30 text-xs">pot</span>
            <span className="text-white/30 text-xs">·</span>
            <span className="text-green-400 text-xs">
              🏆 {topWinnerName}
              {topWinner && ` +◈${topWinner.amount.toLocaleString()}`}
              {entry.winners.length > 1 && ` +${entry.winners.length - 1} more`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-white/30 text-xs">{timeAgo(entry.playedAt)}</span>
          <span className={`text-white/40 text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-white/10">
              <p className="text-white/40 text-xs mt-3 mb-2 uppercase tracking-widest font-cinzel">
                Player Results
              </p>
              <div className="grid gap-1.5">
                {entry.playerSummary.map((p) => {
                  const isWinner = entry.winners.some((w) => w.playerId === p.id);
                  const handName = entry.handDescriptions?.[p.id];
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                        isWinner ? 'bg-[#ffd700]/10 border border-[#ffd700]/25' : 'bg-white/3'
                      }`}
                    >
                      {isWinner ? (
                        <span className="text-[#ffd700]">🏆</span>
                      ) : (
                        <span className="text-white/20">·</span>
                      )}
                      <span className={`font-semibold flex-1 ${isWinner ? 'text-[#ffd700]' : 'text-white/70'}`}>
                        {p.username}
                      </span>
                      {handName && (
                        <span className="text-white/40 text-xs italic">{handName}</span>
                      )}
                      <span
                        className={`font-mono text-xs ${
                          p.status === 'folded' ? 'text-white/30' : isWinner ? 'text-green-400' : 'text-white/60'
                        }`}
                      >
                        {p.status === 'folded' ? 'folded' : `◈ ${p.finalChips.toLocaleString()}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function GameHistoryPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['history'],
    queryFn: historyApi.list,
    refetchInterval: 30_000,
  });

  const history = data?.history ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/lobby')}
            className="text-white/40 hover:text-white transition-colors text-lg leading-none"
          >
            ←
          </button>
          <h1 className="font-cinzel text-xl font-bold text-[#ffd700]">📜 Game History</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {isLoading && (
          <div className="flex justify-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-[#ffd700]/30 border-t-[#ffd700] rounded-full"
            />
          </div>
        )}

        {isError && (
          <div className="text-center py-16 text-white/40">
            <p className="text-4xl mb-3">⚠️</p>
            <p>Failed to load history. Is the server running?</p>
          </div>
        )}

        {!isLoading && !isError && history.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 text-white/40"
          >
            <p className="text-5xl mb-4">🃏</p>
            <p className="font-cinzel text-lg text-white/60">No games played yet</p>
            <p className="text-sm mt-2">Finished rounds will appear here</p>
          </motion.div>
        )}

        {!isLoading && !isError && history.length > 0 && (
          <motion.div
            className="flex flex-col gap-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.055 } },
            }}
          >
            {history.map((entry) => (
              <motion.div
                key={entry.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <EntryRow entry={entry} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
