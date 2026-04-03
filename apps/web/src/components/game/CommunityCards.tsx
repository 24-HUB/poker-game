import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../../../packages/shared/src/types/game';

interface CommunityCardsProps {
  cards: Card[];
}

const CommunityCards: React.FC<CommunityCardsProps> = ({ cards }) => {
  return (
    <div className="flex gap-4" data-testid="community-cards">
      {Array.from({ length: 5 }).map((_, index) => {
        const card = cards[index];
        return (
          <div key={index} className="relative w-20 h-28" data-testid={`community-card-slot-${index}`}>
            <AnimatePresence mode="wait">
              {card ? (
                <motion.div
                  data-testid={`community-card-${index}`}
                  key={`${card.suit}-${card.rank}`}
                  initial={{ rotateY: 180, opacity: 0, scale: 0.8 }}
                  animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                  exit={{ rotateY: -180, opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5, type: 'spring' }}
                  className="w-full h-full bg-white rounded-md border-2 border-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.3)] flex flex-col p-2 relative overflow-hidden"
                >
                  {/* Card Corner Info */}
                  <div className="flex flex-col items-center">
                    <span className="font-cinzel text-xl font-bold text-[#0f0c29] leading-none">{card.rank}</span>
                    <SuitIcon suit={card.suit} size="sm" />
                  </div>
                  
                  {/* Large Center Suit */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    <SuitIcon suit={card.suit} size="lg" />
                  </div>

                  {/* Decorative Elements */}
                  <div className="mt-auto self-end rotate-180">
                     <span className="font-cinzel text-xl font-bold text-[#0f0c29] leading-none">{card.rank}</span>
                     <SuitIcon suit={card.suit} size="sm" />
                  </div>
                </motion.div>
              ) : (
                <div className="w-full h-full border-2 border-[#ffd700]/10 rounded-md bg-black/10 flex items-center justify-center">
                  <span className="font-cinzel text-[#ffd700]/5 text-4xl">◈</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

const SuitIcon: React.FC<{ suit: string, size: 'sm' | 'lg' }> = ({ suit, size }) => {
  const color = (suit === 'hearts' || suit === 'diamonds') ? 'text-red-600' : 'text-[#0f0c29]';
  const icon = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  }[suit] || '?';

  return (
    <span className={`${color} ${size === 'lg' ? 'text-7xl' : 'text-sm'}`}>
      {icon}
    </span>
  );
};

export default CommunityCards;
