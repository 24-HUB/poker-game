import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useGame } from '../../hooks/useGame';
import { useAuthStore } from '../../stores/authStore';

const BettingControls: React.FC = () => {
  const { gameState, isMyTurn } = useGameStore();
  const { sendAction } = useGame();
  const { user } = useAuthStore();
  const [raiseAmount, setRaiseAmount] = useState<number>(0);

  if (!gameState || !isMyTurn) return null;

  const me = gameState.players.find(p => p.id === user?.id);
  if (!me) return null;

  const currentCall = gameState.currentBet - me.bet;
  const minRaise = gameState.currentBet * 2;
  const maxRaise = me.chips + me.bet;

  return (
    <motion.div 
      data-testid="betting-controls"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-center pb-8 px-4 gap-4"
    >
      {/* Action Buttons */}
      <div className="flex gap-4">
        <ActionButton 
          testId="btn-fold"
          label="Fold" 
          color="bg-red-900/40" 
          borderColor="border-red-500/50" 
          onClick={() => sendAction({ type: 'fold', amount: 0 })} 
        />
        
        <ActionButton 
          testId={currentCall > 0 ? 'btn-call' : 'btn-check'}
          label={currentCall > 0 ? `Call (${currentCall})` : "Check"} 
          color="bg-[#1a6b3c]/60" 
          borderColor="border-[#ffd700]/30" 
          onClick={() => sendAction({ type: currentCall > 0 ? 'call' : 'check', amount: 0 })} 
        />

        <div className="flex flex-col gap-2">
           {maxRaise >= minRaise && (
              <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-[#ffd700]/20">
                <input 
                  data-testid="raise-slider"
                  type="range" 
                  min={minRaise} 
                  max={maxRaise} 
                  value={raiseAmount || minRaise}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  className="accent-[#ffd700] w-48"
                />
                <span data-testid="raise-amount" className="font-jetbrains text-[#ffd700] w-16 text-right">{raiseAmount || minRaise}</span>
              </div>
           )}
           <ActionButton 
             testId="btn-raise"
             label="Raise" 
             color="bg-[#ffd700]/10" 
             borderColor="border-[#ffd700]/50" 
             onClick={() => sendAction({ type: 'raise', amount: raiseAmount || minRaise })} 
           />
        </div>
      </div>
    </motion.div>
  );
};

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  color: string;
  borderColor: string;
  testId?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, color, borderColor, testId }) => (
  <motion.button
    data-testid={testId}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`
      ${color} ${borderColor} border px-8 py-3 rounded-md font-cinzel text-white uppercase tracking-widest text-sm
      hover:shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-shadow
    `}
  >
    {label}
  </motion.button>
);

export default BettingControls;
