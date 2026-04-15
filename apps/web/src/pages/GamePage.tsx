import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GameTable from '../components/game/GameTable';
import { useGame } from '../hooks/useGame';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { socket } from '../lib/socket';

// ── Waiting Room ─────────────────────────────────────────────────────────────

interface WaitingRoomProps {
  players: { id: string; username: string; chips: number }[];
  connectionStatus: string;
  onReady: () => void;
  onLeave: () => void;
  awaitingNextRound: boolean;
}

function WaitingRoom({ players, connectionStatus, onReady, onLeave, awaitingNextRound }: WaitingRoomProps) {
  const canReady = players.length >= 2;

  return (
    <motion.div
      key="waiting-room"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col items-center justify-center gap-8 px-4 z-50"
    >
      {/* Title */}
      <div className="text-center">
        <h1 className="font-cinzel text-4xl font-bold text-[#ffd700] drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]">
          ♠ POKER GACHA
        </h1>
        <p className="text-white/40 mt-2 font-cinzel text-sm uppercase tracking-widest">
          {connectionStatus === 'connected'
            ? '🟢 Connected — Waiting Room'
            : '⏳ Connecting…'}
        </p>
      </div>

      {/* Player list */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <p className="font-cinzel text-white/50 text-xs uppercase tracking-widest mb-4">
          Players ({players.length} / 6)
        </p>

        {players.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4 animate-pulse">
            Waiting for players to join…
          </p>
        ) : (
          <div className="space-y-3">
            {players.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
                    alt={p.username}
                    className="w-8 h-8 rounded-full bg-[#0f0c29] border border-white/20"
                  />
                  <span className="font-cinzel text-white text-sm">{p.username}</span>
                </div>
                <span className="font-mono text-[#ffd700] text-xs">◈ {p.chips.toLocaleString()}</span>
              </motion.div>
            ))}
          </div>
        )}

        {!canReady && (
          <p className="text-white/30 text-xs text-center mt-4 font-cinzel border-t border-white/10 pt-3">
            Need at least 2 players to start
          </p>
        )}
      </div>

      {/* Ready / Waiting */}
      {awaitingNextRound ? (
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="font-cinzel text-white/50 tracking-widest text-sm"
        >
          Waiting for others to ready up…
        </motion.p>
      ) : (
        <button
          onClick={onReady}
          disabled={!canReady}
          className="bg-[#ffd700] disabled:opacity-40 disabled:cursor-not-allowed text-[#0f0c29] font-cinzel font-bold uppercase tracking-widest px-12 py-4 rounded-xl text-lg hover:bg-yellow-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.4)]"
        >
          ✅ Ready
        </button>
      )}

      <button
        onClick={onLeave}
        className="font-cinzel text-white/30 hover:text-white/70 text-sm uppercase tracking-widest transition-colors"
      >
        ← Back to Lobby
      </button>
    </motion.div>
  );
}

// ── Game Page ─────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { joinRoom, ready } = useGame();
  const { user } = useAuthStore();
  const { gameState, waitingPlayers, awaitingNextRound, connectionStatus } = useGameStore();

  useEffect(() => {
    if (!user || !roomId) {
      navigate('/lobby');
      return;
    }

    // Attach auth info and connect
    socket.auth = { userId: user.id, username: user.username, chips: user.chips };
    socket.connect();

    joinRoom(roomId);
    // No auto-ready — player must click the Ready button in the waiting room

    return () => {
      socket.emit('room:leave');
      socket.disconnect();
    };
  }, [roomId, user, joinRoom, navigate]);

  const handleLeave = () => {
    socket.emit('room:leave');
    navigate('/lobby');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden" data-testid="app-root">
      {/* Waiting room overlays as long as no active game state */}
      <AnimatePresence>
        {!gameState && (
          <WaitingRoom
            players={waitingPlayers}
            connectionStatus={connectionStatus}
            onReady={ready}
            onLeave={handleLeave}
            awaitingNextRound={awaitingNextRound}
          />
        )}
      </AnimatePresence>

      {/* GameTable is always mounted so socket listeners stay registered */}
      <GameTable />
    </div>
  );
}

