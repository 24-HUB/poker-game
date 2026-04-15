import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useGame } from '../../hooks/useGame';
import { socket } from '../../lib/socket';
import PlayerSeat from './PlayerSeat';
import CommunityCards from './CommunityCards';
import BettingControls from './BettingControls';

const SUIT_SYMBOL: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLOR: Record<string, string>  = { hearts: 'text-red-400', diamonds: 'text-red-400', clubs: 'text-white', spades: 'text-white' };

type ChatMessage = { playerId: string; username: string; message: string; id: number };

// Compute the same position that PlayerSeat uses for seat index/total
function getSeatPos(index: number, total: number): { top: string; left: string } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const rx = 42, ry = 38; // % radii matching PlayerSeat
  const cx = 50, cy = 50;
  return {
    top: `${(cy + ry * Math.sin(angle)).toFixed(1)}%`,
    left: `${(cx + rx * Math.cos(angle)).toFixed(1)}%`,
  };
}

// Animated chip that flies from a seat to the pot
const ChipFly: React.FC<{ from: { top: string; left: string }; onDone: () => void }> = ({ from, onDone }) => (
  <motion.div
    className="absolute w-6 h-6 rounded-full bg-[#ffd700] border-2 border-yellow-300 shadow-[0_0_10px_rgba(255,215,0,0.8)] font-jetbrains text-[#0f0c29] text-[10px] font-bold flex items-center justify-center pointer-events-none z-30"
    style={{ top: from.top, left: from.left, transform: 'translate(-50%,-50%)' }}
    initial={{ scale: 0.5, opacity: 1 }}
    animate={{ top: '40%', left: '50%', scale: 1.2, opacity: 0 }}
    transition={{ duration: 0.55, ease: 'easeIn' }}
    onAnimationComplete={onDone}
  >
    ◈
  </motion.div>
);

const GameTable: React.FC = () => {
  const { gameState, winners, handDescriptions, chipUpdates, awaitingNextRound, turnPlayerId, turnSecondsLeft, turnTotalSeconds, lastBetEvent } = useGameStore();
  const { ready, sendChat } = useGame();
  const navigate = useNavigate();

  const handleLeave = () => {
    socket.emit('room:leave');
    navigate('/lobby');
  };

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const msgCountRef = useRef(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  // Chip fly tokens: index → from-position
  const [chipTokens, setChipTokens] = useState<Array<{ id: number; from: { top: string; left: string } }>>([]);
  const chipIdRef = useRef(0);

  useEffect(() => {
    const handler = (playerId: string, username: string, message: string) => {
      setMessages((prev) => [
        ...prev.slice(-99),
        { playerId, username, message, id: ++msgCountRef.current },
      ]);
    };
    socket.on('game:chatMessage', handler);
    return () => { socket.off('game:chatMessage', handler); };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Chip arc animation trigger ────────────────────────────────────────────
  useEffect(() => {
    if (!lastBetEvent || !gameState) return;
    const playerIdx = gameState.players.findIndex((p: { id: string }) => p.id === lastBetEvent.playerId);
    if (playerIdx === -1) return;
    const pos = getSeatPos(playerIdx, gameState.players.length);
    const id = ++chipIdRef.current;
    setChipTokens((prev) => [...prev, { id, from: pos }]);
  }, [lastBetEvent, gameState]);

  // Turn timer progress (0→1)
  const timerProgress = turnTotalSeconds > 0 ? turnSecondsLeft / turnTotalSeconds : 0;
  const timerUrgent = turnSecondsLeft <= 10 && turnSecondsLeft > 0;

  function submitChat(e: React.FormEvent) {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    sendChat(msg);
    setChatInput('');
  }


  if (!gameState) return null;

  const isShowdown = gameState.phase === 'showdown';

  return (
    <div className="relative w-full h-screen bg-[#0f0c29] flex items-center justify-center overflow-hidden font-inter" data-testid="game-table">
      {/* Leave button — always visible top-left */}
      <button
        onClick={handleLeave}
        className="absolute top-3 left-4 z-40 font-cinzel text-white/30 hover:text-white/80 text-xs uppercase tracking-widest transition-colors"
      >
        ← Lobby
      </button>

      {/* Chip fly tokens */}
      <AnimatePresence>
        {chipTokens.map((token) => (
          <ChipFly
            key={token.id}
            from={token.from}
            onDone={() => setChipTokens((prev) => prev.filter((t) => t.id !== token.id))}
          />
        ))}
      </AnimatePresence>

      {/* Turn timer bar at the very top */}
      {turnPlayerId && (
        <div className="absolute top-0 left-0 right-0 h-1 z-50 bg-white/10">
          <motion.div
            className={`h-full ${timerUrgent ? 'bg-red-500' : 'bg-[#ffd700]'}`}
            style={{ width: `${timerProgress * 100}%` }}
            transition={{ duration: 0.9, ease: 'linear' }}
          />
        </div>
      )}

      {/* The Table */}
      <div className="relative w-[80%] h-[60%] bg-[#1a6b3c] border-8 border-[#ffd700]/30 rounded-[200px] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center">
        
        {/* Pot Display */}
        <div className="absolute top-1/4 flex flex-col items-center" data-testid="pot-display">
          <span className="font-cinzel text-[#ffd700] text-sm uppercase tracking-widest">Total Pot</span>
          <span className="font-jetbrains text-2xl text-white" data-testid="pot-amount">
            <span className="text-[#ffd700] mr-1">◈</span>
            {gameState.pot.toLocaleString()}
          </span>
          {/* Turn timer countdown */}
          {turnPlayerId && turnSecondsLeft > 0 && (
            <motion.span
              key={turnSecondsLeft}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className={`font-jetbrains text-sm mt-1 ${timerUrgent ? 'text-red-400' : 'text-white/50'}`}
            >
              {turnSecondsLeft}s
            </motion.span>
          )}
        </div>

        {/* Community Cards */}
        <CommunityCards cards={gameState.communityCards} />

        {/* Player Seats */}
        {gameState.players.map((player, index) => (
          <PlayerSeat 
            key={player.id} 
            player={player} 
            index={index} 
            totalSeats={gameState.players.length}
          />
        ))}
      </div>

      {/* Game Phase Indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 px-6 py-2 rounded-full border border-[#ffd700]/30" data-testid="game-phase">
        <span className="font-cinzel text-[#ffd700] text-sm uppercase tracking-widest">{gameState.phase.replace('_', ' ')}</span>
      </div>

      {/* Betting Controls */}
      <BettingControls />

      {/* ── Chat Panel ──────────────────────────────────────────────────── */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-1">
        {/* Toggle button */}
        <button
          onClick={() => setChatOpen((v) => !v)}
          className="bg-black/60 border border-white/20 text-white/60 hover:text-white font-cinzel text-xs px-3 py-1.5 rounded-full transition-colors"
        >
          {chatOpen ? 'Hide Chat' : `Chat${messages.length > 0 ? ` (${messages.length})` : ''}`}
        </button>

        <AnimatePresence>
          {chatOpen && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="w-64 bg-black/80 border border-white/10 rounded-xl overflow-hidden flex flex-col"
            >
              {/* Message list */}
              <div className="h-40 overflow-y-auto px-3 py-2 flex flex-col gap-1 text-xs font-inter">
                {messages.length === 0 ? (
                  <p className="text-white/30 text-center mt-4">No messages yet</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id}>
                      <span className="text-[#ffd700]/80 font-bold">{m.username}: </span>
                      <span className="text-white/70">{m.message}</span>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>
              {/* Input */}
              <form onSubmit={submitChat} className="flex border-t border-white/10">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  maxLength={120}
                  placeholder="Say something…"
                  className="flex-1 bg-transparent text-white/80 text-xs px-3 py-2 outline-none placeholder:text-white/20"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-[#ffd700]/70 hover:text-[#ffd700] text-xs font-cinzel transition-colors"
                >
                  ↵
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Showdown Overlay ────────────────────────────────── */}
      <AnimatePresence>
        {isShowdown && (
          <motion.div
            key="showdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-50 gap-8"
          >
            <motion.h1
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-cinzel text-5xl font-bold text-[#ffd700] tracking-widest drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]"
            >
              SHOWDOWN
            </motion.h1>

            {/* Winner announcements */}
            {winners.length > 0 && (
              <div className="flex flex-col items-center gap-3">
                {winners.map((w) => {
                  const player = gameState.players.find(p => p.id === w.playerId);
                  return (
                    <motion.div
                      key={w.playerId}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-[#ffd700]/20 border border-[#ffd700]/60 px-8 py-3 rounded-full text-center"
                    >
                      <span className="font-cinzel text-[#ffd700] text-xl">
                        🏆 {player?.username ?? w.playerId} wins ◈{w.amount}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* All players' hole-card reveal */}
            <div className="flex gap-12">
              {gameState.players.filter(p => p.status !== 'folded').map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center gap-3"
                >
                  <span className="font-cinzel text-white/80 text-sm uppercase tracking-widest">{player.username}</span>
                  <div className="flex gap-2">
                    {(player.cards ?? []).map((card, i) => (
                      <div key={i} className="w-14 h-20 bg-white rounded-lg border-2 border-black/10 shadow-xl flex flex-col items-start justify-between p-1.5">
                        <span className={`text-sm font-bold leading-none ${SUIT_COLOR[card.suit]}`}>{card.rank}</span>
                        <span className={`text-3xl leading-none self-center ${SUIT_COLOR[card.suit]}`}>{SUIT_SYMBOL[card.suit]}</span>
                        <span className={`text-sm font-bold leading-none self-end rotate-180 ${SUIT_COLOR[card.suit]}`}>{card.rank}</span>
                      </div>
                    ))}
                  </div>
                  {/* Hand name badge */}
                  {handDescriptions[player.id] && (
                    <div className="bg-[#ffd700]/20 border border-[#ffd700]/40 px-4 py-1 rounded-full">
                      <span className="font-cinzel text-[#ffd700] text-xs uppercase tracking-wider">
                        {handDescriptions[player.id]}
                      </span>
                    </div>
                  )}
                  {/* Chip delta */}
                  {chipUpdates[player.id] !== undefined && (() => {
                    // startChips = chips remaining after bets + total contributed this hand
                    const startChips = player.chips + player.totalContributed;
                    const delta = chipUpdates[player.id] - startChips;
                    const isPos = delta >= 0;
                    return (
                      <div className="font-jetbrains text-xs">
                        <span className={isPos ? 'text-green-400' : 'text-red-400'}>
                          {isPos ? '+' : ''}{delta.toLocaleString()} ◈
                        </span>
                      </div>
                    );
                  })()}
                </motion.div>
              ))}
            </div>

            {/* Play Again / Leave */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-4 flex flex-col items-center gap-3"
            >
              {awaitingNextRound ? (
                <p className="font-cinzel text-white/60 tracking-widest text-sm">
                  Waiting for others…
                </p>
              ) : (
                <button
                  onClick={ready}
                  className="bg-[#ffd700] text-[#0f0c29] font-cinzel font-bold uppercase tracking-widest px-10 py-3 rounded-lg text-lg hover:bg-yellow-400 transition-colors shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                >
                  Play Again
                </button>
              )}
              <button
                onClick={handleLeave}
                className="font-cinzel text-white/40 hover:text-white/80 text-sm uppercase tracking-widest transition-colors"
              >
                ← Leave Table
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameTable;

