import React, { useEffect } from 'react';
import GameTable from './components/game/GameTable';
import { useGame } from './hooks/useGame';
import { useAuthStore } from './stores/authStore';

function App() {
  const { joinRoom, ready } = useGame();
  const { setUser } = useAuthStore();

  useEffect(() => {
    // Generate random mock user so multiple tabs can join the same room
    const randomId = Math.random().toString(36).substring(7);
    const mockUser = {
      id: `USER_${randomId}`,
      username: `Player_${randomId}`,
      email: `player_${randomId}@example.com`,
      chips: 1000,
    };
    setUser(mockUser);
    
    // Pass user to socket so backend can assign it, then connect
    import('./lib/socket').then(({ socket }) => {
      socket.auth = { mockUser };
      socket.connect();
    });

    // Automatically join a test room and ready up for local dev
    joinRoom('test-room');
    setTimeout(() => {
       ready();
    }, 1000);
  }, [joinRoom, ready, setUser]);

  return (
    <div className="w-full h-screen overflow-hidden" data-testid="app-root">
      <GameTable />
    </div>
  );
}

export default App;
