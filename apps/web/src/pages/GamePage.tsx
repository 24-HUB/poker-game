import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameTable from '../components/game/GameTable';
import { useGame } from '../hooks/useGame';
import { useAuthStore } from '../stores/authStore';
import { socket } from '../lib/socket';

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { joinRoom, ready } = useGame();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !roomId) {
      navigate('/lobby');
      return;
    }

    // Attach auth info and connect
    socket.auth = { userId: user.id, username: user.username, chips: user.chips };
    socket.connect();

    joinRoom(roomId);

    // Signal ready after a short delay (ensures join event is processed first)
    const t = setTimeout(() => ready(), 800);

    return () => {
      clearTimeout(t);
      socket.emit('room:leave');
      socket.disconnect();
    };
  }, [roomId, user, joinRoom, ready, navigate]);

  return (
    <div className="w-full h-screen overflow-hidden" data-testid="app-root">
      <GameTable />
    </div>
  );
}
