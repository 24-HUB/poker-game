'use client';

import { roomTitleSchema } from '@poker/contracts';
import { ArrowLeft, ArrowRight, Clock3, Plus, Users } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { CompanionPortrait } from '../../components/shell/CompanionPortrait';
import { Icon } from '../../components/ui/Icon';

export type LobbyProps = {
  onCreate: (title: string) => void | Promise<void>;
  onJoin: (token: string) => void | Promise<void>;
  pending: boolean;
  error: string | null;
  initialInvitation?: string | null;
};

type LobbyMode = 'actions' | 'create' | 'join';

export function Lobby({ onCreate, onJoin, pending, error, initialInvitation = null }: LobbyProps) {
  const [mode, setMode] = useState<LobbyMode>(initialInvitation ? 'join' : 'actions');
  const [title, setTitle] = useState('');
  const [invitation, setInvitation] = useState(initialInvitation ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!initialInvitation) return;
    setInvitation(initialInvitation);
    setMode('join');
  }, [initialInvitation]);

  function show(nextMode: Exclude<LobbyMode, 'actions'>, trigger: HTMLButtonElement) {
    lastTrigger.current = trigger;
    setValidationError(null);
    setMode(nextMode);
  }

  function returnToActions() {
    setMode('actions');
    requestAnimationFrame(() => lastTrigger.current?.focus());
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    returnToActions();
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = roomTitleSchema.safeParse(title);
    if (!parsed.success) {
      setValidationError('Use a room title between 1 and 24 characters.');
      return;
    }
    setValidationError(null);
    void onCreate(parsed.data);
    returnToActions();
  }

  function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = invitation.trim();
    if (!token) {
      setValidationError('Enter the private invitation from the host.');
      return;
    }
    setValidationError(null);
    void onJoin(token);
    returnToActions();
  }

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
          <div className="room-actions" hidden={mode !== 'actions'}>
            <button className="room-action room-action--primary" type="button" aria-label="Create Room" onClick={(event) => show('create', event.currentTarget)}>
              <span className="room-action__icon"><Icon icon={Plus} /></span>
              <span><strong>Create Room</strong><small>Start a private table for 2–6 players.</small></span>
              <span className="room-action__arrow"><Icon icon={ArrowRight} /></span>
            </button>
            <button className="room-action room-action--secondary" type="button" aria-label="Join Room" onClick={(event) => show('join', event.currentTarget)}>
              <span className="room-action__icon"><Icon icon={Users} /></span>
              <span><strong>Join Room</strong><small>Use a private invitation from the host.</small></span>
              <span className="room-action__arrow"><Icon icon={ArrowRight} /></span>
            </button>
          </div>
          {mode === 'create' ? (
            <form className="room-form" onSubmit={submitCreate} onKeyDown={handleFormKeyDown}>
              <button className="room-form__back" type="button" onClick={returnToActions}>
                <Icon icon={ArrowLeft} /> Back to room options
              </button>
              <div>
                <h3>Set your table.</h3>
                <p>Give the room a short name your friends will recognize.</p>
              </div>
              <label>
                Room title
                <input
                  autoFocus
                  maxLength={24}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  autoComplete="off"
                />
              </label>
              <button className="primary-button" type="submit" disabled={pending}>Create private room</button>
            </form>
          ) : null}
          {mode === 'join' ? (
            <form className="room-form" onSubmit={submitJoin} onKeyDown={handleFormKeyDown}>
              <button className="room-form__back" type="button" onClick={returnToActions}>
                <Icon icon={ArrowLeft} /> Back to room options
              </button>
              <div>
                <h3>A seat is waiting.</h3>
                <p>Paste the private invitation sent by the room host.</p>
              </div>
              <label>
                Private invitation
                <input
                  autoFocus
                  value={invitation}
                  onChange={(event) => setInvitation(event.target.value)}
                  autoComplete="off"
                />
              </label>
              <button className="primary-button" type="submit" disabled={pending}>Join private room</button>
            </form>
          ) : null}
          {validationError || error ? <p className="room-form__error" role="alert">{validationError ?? error}</p> : null}
          <p className="quiet-note"><Icon icon={Clock3} /> Rooms expire after 24 hours.</p>
        </div>
        <CompanionPortrait />
      </div>
      <footer className="lobby-footer">Private Texas Hold’em · Cosmetic collections arrive later.</footer>
    </section>
  );
}
