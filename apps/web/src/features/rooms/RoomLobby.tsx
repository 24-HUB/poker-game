'use client';

import type { RoomView } from '@poker/contracts';
import { useState } from 'react';
import { Copy, Link2, LogOut, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';

import { Icon } from '../../components/ui/Icon';
import type { RoomConnectionStatus } from './useRoomConnection';

export type RoomLobbyProps = {
  accountId: string;
  room: RoomView;
  status: RoomConnectionStatus;
  pending: boolean;
  invitationCode: string | null;
  message: string | null;
  canRetryPending: boolean;
  onTakeSeat: (seat: number) => void;
  onRotateInvitation: () => void;
  onClaimControl: () => void;
  onLeave: () => void;
  onRetryPending: () => void;
  onStart: () => void;
};

export function RoomLobby({
  accountId,
  room,
  status,
  pending,
  invitationCode,
  message,
  canRetryPending,
  onTakeSeat,
  onRotateInvitation,
  onClaimControl,
  onLeave,
  onRetryPending,
  onStart,
}: RoomLobbyProps) {
  const isHost = room.hostAccountId === accountId;
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  async function copyInvitation() {
    if (!invitationCode) return;
    try { await navigator.clipboard.writeText(invitationCode); setCopyMessage('Invite code copied.'); }
    catch { setCopyMessage('Copy failed. Select and copy the invite code above.'); }
  }

  return (
    <section className="room-lobby" aria-labelledby="room-title">
      <header className="page-heading room-lobby__heading">
        <div>
          <h1 id="room-title">{room.title}</h1>
          <p>{room.members.length} of 6 members</p>
        </div>
        <span className={`connection-state connection-state--${status}`}>{connectionLabel(status)}</span>
      </header>

      <div className="room-lobby__grid">
        <div>
          <ul className="room-seats" aria-label="Table seats">
            {Array.from({ length: 6 }, (_, seat) => {
              const member = room.members.find((candidate) => candidate.seat === seat);
              return (
                <li className={member ? 'room-seat room-seat--occupied' : 'room-seat'} key={seat}>
                  <span className="room-seat__number">Seat {seat + 1}</span>
                  {member ? (
                    <>
                      <span className="room-seat__avatar"><Icon icon={UserRound} /></span>
                      <strong>{member.displayName}{member.accountId === accountId ? ' (you)' : ''}</strong>
                      <small>{member.connected ? 'Connected' : 'Reconnecting'}{member.accountId === room.hostAccountId ? ' · Host' : ''}</small>
                    </>
                  ) : (
                    <>
                      <span className="room-seat__avatar room-seat__avatar--empty">{seat + 1}</span>
                      <strong>Open seat</strong>
                      <button type="button" disabled={pending || !room.control.isController} onClick={() => onTakeSeat(seat)}>Take seat {seat + 1}</button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="room-milestone"><ShieldCheck aria-hidden="true" /> Private table · chips reset with each session. Cosmetics do not affect cards.</p>
        </div>

        <aside className="room-controls" aria-label="Room controls">
          <div>
            <h2>Bring your table together.</h2>
            <p>Only people with the current private invitation can join.</p>
          </div>
          {invitationCode ? <label>Invite code<input className="invite-code" readOnly value={invitationCode} onFocus={(event) => event.target.select()} /></label> : null}
          {invitationCode ? (
            <button className="primary-button" type="button" disabled={pending} onClick={() => void copyInvitation()}>
              <Icon icon={Copy} /> Copy invite code
            </button>
          ) : null}
          {copyMessage ? <p role="status">{copyMessage}</p> : null}
          {isHost ? (
            <button className="primary-button" type="button" disabled={pending || status !== 'connected' || !room.control.isController || room.members.filter((member) => member.seat !== null).length < 2} onClick={onStart}>
              Start poker session
            </button>
          ) : null}
          <p className="room-control-guidance">{pending ? 'Waiting for the room command to be confirmed.'
            : status !== 'connected' ? 'Reconnect before changing seats or starting.'
              : !room.control.isController ? 'You are watching from this tab. Use this tab to play to change seats, start or leave.'
                : room.members.filter((member) => member.seat !== null).length < 2 ? 'Waiting for another player. At least two seated players are needed to start.'
                  : !isHost ? 'Waiting for the host to start the session.' : 'Your table is ready to start.'}</p>
          {isHost ? (
            <button className="secondary-button" type="button" disabled={pending || !room.control.isController} onClick={onRotateInvitation}>
              <Icon icon={RefreshCw} /> Rotate room invitation
            </button>
          ) : null}
          {!room.control.isController ? (
            <button className="secondary-button" type="button" disabled={pending} onClick={onClaimControl}>
              <Icon icon={Link2} /> Use this tab to play
            </button>
          ) : null}
          <button className="text-button" type="button" disabled={pending || !room.control.isController} onClick={onLeave}>
            <Icon icon={LogOut} /> Leave room
          </button>
          {message ? <p className="room-control-message" role="status">{message}</p> : null}
          {canRetryPending ? (
            <button className="secondary-button" type="button" onClick={onRetryPending}>Reconcile pending room action</button>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function connectionLabel(status: RoomConnectionStatus) {
  switch (status) {
    case 'connected': return 'Connected';
    case 'connecting': return 'Connecting';
    case 'reconnecting': return 'Reconnecting';
    case 'unavailable': return 'Service unavailable';
    case 'closed': return 'Connection closed';
  }
}
