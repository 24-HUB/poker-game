'use client';

import { ArrowRight, Clock3, Plus, Users } from 'lucide-react';

import { CompanionPortrait } from '../../components/shell/CompanionPortrait';
import { Icon } from '../../components/ui/Icon';

export type LobbyProps = {
  onCreate: () => void;
  onJoin: () => void;
};

export function Lobby({ onCreate, onJoin }: LobbyProps) {
  return (
    <section aria-label="Private room lobby">
      <header className="page-heading">
        <div><h1>Lobby</h1><p>Your next hand starts here.</p></div>
        <span><Icon icon={Users} /> Private tables · 2–6 friends</span>
      </header>
      <div className="lobby-layout">
        <div className="lobby-copy">
          <div className="welcome">
            <h2>Play with friends.<br /><span>Your table is waiting.</span></h2>
            <p>Set the table, invite your friends, and make yourself at home.</p>
          </div>
          <div className="room-actions">
            <button className="room-action room-action--primary" type="button" aria-label="Create Room" onClick={onCreate}>
              <span className="room-action__icon"><Icon icon={Plus} /></span>
              <span><strong>Create Room</strong><small>Start a private table for 2–6 players.</small></span>
              <span className="room-action__arrow"><Icon icon={ArrowRight} /></span>
            </button>
            <button className="room-action room-action--secondary" type="button" aria-label="Join Room" onClick={onJoin}>
              <span className="room-action__icon"><Icon icon={Users} /></span>
              <span><strong>Join Room</strong><small>Use a private invitation from the host.</small></span>
              <span className="room-action__arrow"><Icon icon={ArrowRight} /></span>
            </button>
          </div>
          <p className="quiet-note"><Icon icon={Clock3} /> Rooms expire after 24 hours.</p>
        </div>
        <CompanionPortrait />
      </div>
      <footer className="lobby-footer">Private Texas Hold’em · Cosmetic collections arrive later.</footer>
    </section>
  );
}
