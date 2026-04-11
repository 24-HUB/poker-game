import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import GachaPage from './pages/GachaPage';
import CollectionPage from './pages/CollectionPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/lobby"
          element={
            <RequireAuth>
              <LobbyPage />
            </RequireAuth>
          }
        />
        <Route
          path="/game/:roomId"
          element={
            <RequireAuth>
              <GamePage />
            </RequireAuth>
          }
        />
        <Route
          path="/gacha"
          element={
            <RequireAuth>
              <GachaPage />
            </RequireAuth>
          }
        />
        <Route
          path="/collection"
          element={
            <RequireAuth>
              <CollectionPage />
            </RequireAuth>
          }
        />
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/lobby" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
