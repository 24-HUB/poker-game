'use client';

import { Club, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '../../components/ui/Icon';
import { Lobby } from './Lobby';

type RoomAction = 'create' | 'join';

export function LobbyExperience() {
  const [action, setAction] = useState<RoomAction | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  function openDialog(nextAction: RoomAction) {
    lastTrigger.current = document.activeElement as HTMLButtonElement;
    setAction(nextAction);
  }

  useEffect(() => {
    if (action && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [action]);

  function closeDialog() {
    dialog.current?.close();
  }

  return (
    <>
      <Lobby onCreate={() => openDialog('create')} onJoin={() => openDialog('join')} />
      <dialog
        ref={dialog}
        className="room-dialog"
        aria-labelledby="room-dialog-title"
        onClose={() => {
          setAction(null);
          lastTrigger.current?.focus();
        }}
      >
        <div className="dialog-heading">
          <Icon icon={Club} />
          <button className="icon-button" type="button" onClick={closeDialog} aria-label="Close dialog"><Icon icon={X} /></button>
        </div>
        <h2 id="room-dialog-title">{action === 'join' ? 'A seat is waiting.' : 'Set your table.'}</h2>
        <p>
          {action === 'join'
            ? 'Sign in first, then open the private invitation from your host.'
            : 'Room creation will be available after you sign in.'}
        </p>
        <p className="dialog-status">Accounts and secure room actions are connected in the next implementation task.</p>
        <button className="primary-button" type="button" onClick={closeDialog}>Got it</button>
      </dialog>
    </>
  );
}
