import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Room } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useDeleteRoom } from '../../hooks/useRooms';
import { Button } from '../ui/Button';

interface RoomListProps {
  rooms: Room[];
  isLoading: boolean;
}

const statusColor: Record<Room['status'], string> = {
  waiting: 'text-[#2ecc71]',
  playing: 'text-yellow-400',
  finished: 'text-white/30',
};

const statusLabel: Record<Room['status'], string> = {
  waiting: 'Open',
  playing: 'In Game',
  finished: 'Finished',
};

export const RoomList: React.FC<RoomListProps> = ({ rooms, isLoading }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { mutate: deleteRoom, isPending: isDeleting } = useDeleteRoom();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="text-white/40 animate-pulse">Loading rooms…</span>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 text-white/30">
        No open rooms yet. Be the first to create one!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rooms.map((room) => (
        <div
          key={room.id}
          className="flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-5 py-4 transition-colors"
        >
          {/* Room info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white truncate">{room.name}</span>
              <span className={`text-xs font-mono ${statusColor[room.status]}`}>
                ● {statusLabel[room.status]}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-white/40 mt-1">
              <span>👥 {room.playerCount} / {room.maxPlayers}</span>
              <span>💰 Min bet: {room.minBet}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 ml-4 shrink-0">
            {room.status === 'waiting' && (
              <Button
                size="sm"
                onClick={() => navigate(`/game/${room.id}`)}
              >
                Join
              </Button>
            )}
            {user?.id === room.hostId && (
              <Button
                size="sm"
                variant="danger"
                loading={isDeleting}
                onClick={() => deleteRoom(room.id)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
