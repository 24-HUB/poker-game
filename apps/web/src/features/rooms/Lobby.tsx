'use client';

import { roomTitleSchema, type CosmeticItem } from '@poker/contracts';
import { ArrowLeft, ArrowRight, Clock3, Plus, Users } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { CompanionPortrait } from '../../components/shell/CompanionPortrait';
import { Icon } from '../../components/ui/Icon';
import type { SessionState } from '../../lib/auth-client';
import { SignInButton } from '../auth/SignInButton';
import { useLobbyDraft } from './LobbyDraftProvider';

export type LobbyProps = {
  onCreate: (title: string) => void | Promise<void>;
  onJoin: (token: string) => void | Promise<void>;
  pending: boolean;
  error: string | null;
  initialInvitation?: string | null;
  canRetryPending?: boolean;
  onRetryPending?: () => void | Promise<void>;
  session?: SessionState;
  onAuthenticated?: () => void;
  avatar?: CosmeticItem | null;
  avatarPending?: boolean;
};

type LobbyMode = 'actions' | 'create' | 'join';

export function Lobby({
  onCreate,
  onJoin,
  pending,
  error,
  initialInvitation = null,
  canRetryPending = false,
  onRetryPending,
  session,
  onAuthenticated = () => {},
  avatar,
  avatarPending,
}: LobbyProps) {
  const savedDraft = useLobbyDraft();
  const [localMode, setLocalMode] = useState<LobbyMode>(initialInvitation ? 'join' : 'actions');
  const [localTitle, setLocalTitle] = useState('');
  const [localInvitation, setLocalInvitation] = useState(initialInvitation ?? '');
  const mode = savedDraft?.draft.mode ?? localMode;
  const title = savedDraft?.draft.title ?? localTitle;
  const invitation = savedDraft?.draft.invitation ?? localInvitation;
  const setMode = (mode: LobbyMode) => savedDraft ? savedDraft.update({ mode }) : setLocalMode(mode);
  const setTitle = (title: string) => savedDraft ? savedDraft.update({ title }) : setLocalTitle(title);
  const setInvitation = (invitation: string) => savedDraft ? savedDraft.update({ invitation }) : setLocalInvitation(invitation);
  const [validationError, setValidationError] = useState<string | null>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const createTrigger = useRef<HTMLButtonElement | null>(null);
  const joinTrigger = useRef<HTMLButtonElement | null>(null);
  const errorSummary = useRef<HTMLParagraphElement | null>(null);
  const formError = validationError ?? error;
  useEffect(() => { if (formError) errorSummary.current?.focus(); }, [formError]);
  const access = session?.status === 'unauthenticated' ? <div className="room-entry-access">
    <p>Sign in to {mode === 'create' ? 'create a private room' : 'join your friend’s room'}. Your draft stays in this tab.</p>
    <SignInButton onAuthenticated={onAuthenticated} />
  </div> : session?.status === 'unavailable' ? <p role="status">The game server is starting. <button type="button" onClick={onAuthenticated}>Retry connection</button></p> : null;
  const errorNotice = formError ? <p id="room-entry-error" ref={errorSummary} tabIndex={-1} className="room-form__error" role="alert">{formError}</p> : null;

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
    const trigger = lastTrigger.current ?? (mode === 'create' ? createTrigger.current : joinTrigger.current);
    setMode('actions');
    requestAnimationFrame(() => trigger?.focus());
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
  }

  function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = invitation.trim();
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      setValidationError('Paste the complete invite code from the host.');
      return;
    }
    setValidationError(null);
    void onJoin(token);
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
            <button ref={createTrigger} className="room-action room-action--primary" type="button" aria-label="Create Room" onClick={(event) => show('create', event.currentTarget)}>
              <span className="room-action__icon"><Icon icon={Plus} /></span>
              <span><strong>Create Room</strong><small>Start a private table for 2–6 players.</small></span>
              <span className="room-action__arrow"><Icon icon={ArrowRight} /></span>
            </button>
            <button ref={joinTrigger} className="room-action room-action--secondary" type="button" aria-label="Join Room" onClick={(event) => show('join', event.currentTarget)}>
              <span className="room-action__icon"><Icon icon={Users} /></span>
              <span><strong>Join Room</strong><small>Use a private invitation from the host.</small></span>
              <span className="room-action__arrow"><Icon icon={ArrowRight} /></span>
            </button>
          </div>
          {mode === 'actions' && session?.status === 'unauthenticated' ? <p>Sign in is required to create or join a private room.</p> : null}
          {mode !== 'actions' ? access : null}
          {mode === 'create' ? (
            <form className="room-form" aria-busy={pending} onSubmit={submitCreate} onKeyDown={handleFormKeyDown}>
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
                  aria-invalid={Boolean(formError)}
                  aria-describedby={formError ? 'room-entry-error' : undefined}
                />
              </label>
              {errorNotice}
              <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create private room'}</button>
            </form>
          ) : null}
          {mode === 'join' ? (
            <form className="room-form" aria-busy={pending} onSubmit={submitJoin} onKeyDown={handleFormKeyDown}>
              <button className="room-form__back" type="button" onClick={returnToActions}>
                <Icon icon={ArrowLeft} /> Back to room options
              </button>
              <div>
                <h3>A seat is waiting.</h3>
                <p>Paste the invite code sent by the room host.</p>
              </div>
              <label>
                Invite code
                <input
                  autoFocus
                  value={invitation}
                  onChange={(event) => setInvitation(event.target.value)}
                  autoComplete="off"
                  aria-invalid={Boolean(formError)}
                  aria-describedby={formError ? 'room-entry-error' : undefined}
                />
              </label>
              {errorNotice}
              <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Joining…' : 'Join private room'}</button>
            </form>
          ) : null}
          {mode === 'actions' ? errorNotice : null}
          {canRetryPending && onRetryPending ? (
            <button className="secondary-button room-reconcile" type="button" onClick={() => void onRetryPending()}>
              Reconcile pending room action
            </button>
          ) : null}
          <p className="quiet-note"><Icon icon={Clock3} /> Room invite codes expire after 24 hours.</p>
        </div>
        <CompanionPortrait avatar={avatar} pending={avatarPending} />
      </div>
      <footer className="lobby-footer">Private Texas Hold’em · Earn tickets for cosmetic avatars and card backs.</footer>
    </section>
  );
}
