'use client';
import { useEffect, useState } from 'react';
import type { GameView } from '@poker/contracts';

export function useTurnClock(game: GameView | null) {
  const [clock, setClock] = useState(() => {
    const now = Date.now();
    return { now, offset: game ? Date.parse(game.serverTime) - now : 0 };
  });
  useEffect(() => {
    if (!game) return;
    const now = Date.now();
    setClock({ now, offset: Date.parse(game.serverTime) - now });
  }, [game?.serverTime]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock((value) => ({ ...value, now: Date.now() })), 250);
    return () => window.clearInterval(timer);
  }, []);
  return game?.deadline ? Math.max(0, Math.ceil((Date.parse(game.deadline) - clock.now - clock.offset) / 1000)) : null;
}
