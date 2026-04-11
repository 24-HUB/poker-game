import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerState, Card } from '@poker/shared';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';

interface PlayerSeatProps {
  player: PlayerState;
  index: number;
  totalSeats: number;
}

const SUIT_SYMBOL: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLOR: Record<string, string> = { hearts: 'text-red-500', diamonds: 'text-red-500', clubs: 'text-gray-900', spades: 'text-gray-900' };

const CardFace: React.FC<{ card: Card }> = ({ card }) => (
  <div className="w-9 h-14 bg-white rounded border border-black/20 shadow-md flex flex-col items-start justify-between p-0.5 select-none">
    <span className={`text-xs font-bold leading-none ${SUIT_COLOR[card.suit]}`}>{card.rank}</span>
    <span className={`text-lg leading-none self-center ${SUIT_COLOR[card.suit]}`}>{SUIT_SYMBOL[card.suit]}</span>
    <span className={`text-xs font-bold leading-none self-end rotate-180 ${SUIT_COLOR[card.suit]}`}>{card.rank}</span>
  </div>
);

const CardBack: React.FC = () => (
  <div className="w-9 h-14 rounded border border-[#ffd700]/30 shadow-md flex items-center justify-center"
       style={{ background: 'repeating-linear-gradient(45deg,#0f0c29,#0f0c29 4px,#1a1540 4px,#1a1540 8px)' }}>
    <span className="text-[#ffd700] text-base opacity-50">◈</span>
  </div>
);

const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, index, totalSeats }) => {
  const { myCards, gameState } = useGameStore();
  const { user } = useAuthStore();
  const isMe = player.id === user?.id;
  const isShowdown = gameState?.phase === 'showdown';

  // Position on the oval table
  const angle = (index / totalSeats) * 2 * Math.PI + Math.PI / 2;
  const left = 50 + 45 * Math.cos(angle);
  const top  = 50 + 45 * Math.sin(angle);

  const isFolded = player.status === 'folded';
  const isActive = player.isTurn;

  // Determine which cards to show
  const displayCards: (Card | null)[] = [0, 1].map((i) => {
    if (isMe) return myCards[i] ?? null;
    if (isShowdown && player.cards?.[i]) return player.cards[i];
    return null; // card back
  });

  return (
    <div 
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${left}%`, top: `${top}%` }}
      data-testid={`player-seat-${player.id}`}
    >
      <div className={`relative flex flex-col items-center gap-2 transition-all duration-300 ${isFolded ? 'opacity-50 grayscale' : 'opacity-100'}`}
           data-player-status={player.status}
           data-player-turn={isActive ? 'true' : 'false'}
      >
        {/* Current bet bubble */}
        <AnimatePresence>
          {player.bet > 0 && (
            <motion.div 
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: -20 }}
              className="absolute -top-12 bg-black/60 px-3 py-1 rounded-full border border-[#ffd700]/30"
            >
              <span className="font-jetbrains text-[#ffd700] text-sm">◈ {player.bet}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar */}
        <div className={`
          relative w-24 h-24 rounded-full border-4 overflow-hidden shadow-2xl transition-all
          ${isActive ? 'border-[#ffd700] ring-4 ring-[#ffd700]/30 animate-pulse' : 'border-white/20'}
        `}>
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`} alt={player.username} className="w-full h-full object-cover bg-[#0f0c29]" />
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-1 text-center">
             <span className="text-[10px] text-white/70 uppercase block">Chips</span>
             <span className="font-jetbrains text-[#ffd700] text-sm leading-none">{player.chips.toLocaleString()}</span>
          </div>
        </div>

        {/* Username */}
        <div className="bg-[#ffd700] text-[#0f0c29] px-4 py-0.5 rounded-sm font-cinzel text-xs font-bold uppercase shadow-lg">
          {isMe ? `${player.username} (You)` : player.username}
        </div>

        {/* Cards */}
        {player.status !== 'folded' && (
          <div className="flex gap-1 mt-1">
            {displayCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                {card ? <CardFace card={card} /> : <CardBack />}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerSeat;

