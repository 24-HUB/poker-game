import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useGame } from '../../hooks/useGame';
import PlayerSeat from './PlayerSeat';
import CommunityCards from './CommunityCards';
import BettingControls from './BettingControls';

const SUIT_SYMBOL: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLOR: Record<string, string>  = { hearts: 'text-red-400', diamonds: 'text-red-400', clubs: 'text-white', spades: 'text-white' };

const GameTable: React.FC = () => {
  const { gameState, winners, handDescriptions, chipUpdates, awaitingNextRound } = useGameStore();
  const { ready } = useGame();

  if (!gameState) return <div className="text-white" data-testid="waiting-message">Waiting for game to start...</div>;

  const isShowdown = gameState.phase === 'showdown';

  return (
    <div className="relative w-full h-screen bg-[#0f0c29] flex items-center justify-center overflow-hidden font-inter" data-testid="game-table">
      {/* The Table */}
      <div className="relative w-[80%] h-[60%] bg-[#1a6b3c] border-8 border-[#ffd700]/30 rounded-[200px] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center">
        
        {/* Pot Display */}
        <div className="absolute top-1/4 flex flex-col items-center" data-testid="pot-display">
          <span className="font-cinzel text-[#ffd700] text-sm uppercase tracking-widest">Total Pot</span>
          <span className="font-jetbrains text-2xl text-white" data-testid="pot-amount">
            <span className="text-[#ffd700] mr-1">◈</span>
            {gameState.pot.toLocaleString()}
          </span>
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

            {/* Play Again */}
            {awaitingNextRound ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 font-cinzel text-white/60 tracking-widest text-sm"
              >
                Waiting for others…
              </motion.p>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={ready}
                className="mt-4 bg-[#ffd700] text-[#0f0c29] font-cinzel font-bold uppercase tracking-widest px-10 py-3 rounded-lg text-lg hover:bg-yellow-400 transition-colors shadow-[0_0_20px_rgba(255,215,0,0.4)]"
              >
                Play Again
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameTable;

