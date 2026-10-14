'use client';
import { useEffect, useState } from 'react';
import type { GameView } from '@poker/contracts';
import { serverClockOffset } from './serverClock';

export function useTurnClock(game: GameView | null, target = game?.deadline) {
  const [clock, setClock] = useState(() => {
    const now = Date.now();
    return { now, offset: game ? serverClockOffset(game) : 0 };
  });
  useEffect(() => {
    if (!game) return;
    const now = Date.now();
    setClock({ now, offset: serverClockOffset(game) });
  }, [game?.serverTime]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock((value) => ({ ...value, now: Date.now() })), 250);
    return () => window.clearInterval(timer);
  }, []);
  return target ? Math.max(0, Math.ceil((Date.parse(target) - clock.now - clock.offset) / 1000)) : null;
}
