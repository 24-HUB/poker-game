import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useCreateRoom } from '../../hooks/useRooms';

interface CreateRoomModalProps {
  onClose: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { mutate: createRoom, isPending, error } = useCreateRoom();

  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [minBet, setMinBet] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRoom(
      { name, maxPlayers, minBet },
      { onSuccess: (room) => navigate(`/game/${room.id}`) }
    );
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#1a1730] border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="font-cinzel text-xl text-[#ffd700] mb-6">Create Room</h2>

        {error && (
          <div className="mb-4 p-3 bg-[#e74c3c]/20 border border-[#e74c3c]/40 rounded-lg text-red-300 text-sm">
            {error.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Room Name */}
          <div>
            <label className="block text-white/70 text-sm mb-1">Room Name</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#ffd700]/60 transition-colors"
              placeholder="My Poker Room"
            />
          </div>

          {/* Max Players */}
          <div>
            <label className="block text-white/70 text-sm mb-1">
              Max Players <span className="text-[#ffd700]">{maxPlayers}</span>
            </label>
            <input
              type="range"
              min={2}
              max={9}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-[#ffd700]"
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>2</span><span>9</span>
            </div>
          </div>

          {/* Min Bet */}
          <div>
            <label className="block text-white/70 text-sm mb-1">Minimum Bet</label>
            <select
              value={minBet}
              onChange={(e) => setMinBet(Number(e.target.value))}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#ffd700]/60 transition-colors"
            >
              {[5, 10, 25, 50, 100].map((v) => (
                <option key={v} value={v}>{v} chips</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" size="md" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="md" loading={isPending} className="flex-1">
              Create & Join
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
