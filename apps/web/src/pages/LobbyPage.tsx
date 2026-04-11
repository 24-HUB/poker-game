import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomList } from '../components/lobby/RoomList';
import { CreateRoomModal } from '../components/lobby/CreateRoomModal';
import { Button } from '../components/ui/Button';
import { useRooms } from '../hooks/useRooms';
import { useLogout } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';

export default function LobbyPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: rooms = [], isLoading, refetch } = useRooms();
  const { mutate: logout, isPending: loggingOut } = useLogout();
  const [showCreate, setShowCreate] = useState(false);

  const handleLogout = () => {
    logout(undefined, { onSuccess: () => navigate('/login') });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="font-cinzel text-2xl font-bold text-[#ffd700]">♠ POKER GACHA</h1>

          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right">
                <p className="text-white font-semibold text-sm">{user.username}</p>
                <p className="text-[#ffd700] font-mono text-xs">◈ {user.chips.toLocaleString()}</p>
              </div>
            )}
            <Button variant="ghost" size="sm" loading={loggingOut} onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-cinzel text-xl text-white">Open Rooms</h2>
            <p className="text-white/40 text-sm mt-0.5">Join an existing game or create your own</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              ↻ Refresh
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              + Create Room
            </Button>
          </div>
        </div>

        <RoomList rooms={rooms} isLoading={isLoading} />

        {/* Quick-nav to Gacha / Collection */}
        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={() => navigate('/gacha')}
            className="flex flex-col items-center gap-1 border border-[#ffd700]/30 rounded-xl px-6 py-3 text-[#ffd700] hover:bg-[#ffd700]/10 transition-colors"
          >
            <span className="text-2xl">✨</span>
            <span className="font-cinzel text-xs uppercase tracking-widest">Gacha</span>
          </button>
          <button
            onClick={() => navigate('/collection')}
            className="flex flex-col items-center gap-1 border border-white/20 rounded-xl px-6 py-3 text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <span className="text-2xl">📦</span>
            <span className="font-cinzel text-xs uppercase tracking-widest">Collection</span>
          </button>
        </div>
      </main>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
