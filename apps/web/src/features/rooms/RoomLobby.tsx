'use client';

import type { RoomView } from '@poker/contracts';
import { Copy, Link2, LogOut, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';

import { Icon } from '../../components/ui/Icon';
import type { RoomConnectionStatus } from './useRoomConnection';

export type RoomLobbyProps = {
  accountId: string;
  room: RoomView;
  status: RoomConnectionStatus;
  pending: boolean;
  invitationUrl: string | null;
  message: string | null;
  onTakeSeat: (seat: number) => void;
  onRotateInvitation: () => void;
  onClaimControl: () => void;
  onLeave: () => void;
};

export function RoomLobby({
  accountId,
  room,
  status,
  pending,
  invitationUrl,
  message,
  onTakeSeat,
  onRotateInvitation,
  onClaimControl,
  onLeave,
}: RoomLobbyProps) {
  const isHost = room.hostAccountId === accountId;

  async function copyInvitation() {
    if (invitationUrl) await navigator.clipboard.writeText(invitationUrl);
  }

  return (
    <section className="room-lobby" aria-labelledby="room-title">
      <header className="page-heading room-lobby__heading">
        <div>
          <p className="room-eyebrow">Private room</p>
          <h1 id="room-title">{room.title}</h1>
          <p>{room.members.length} of 6 members · revision {room.revision}</p>
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
          <p className="room-milestone"><ShieldCheck aria-hidden="true" /> Poker starts in M2. This room is for gathering the table securely.</p>
        </div>

        <aside className="room-controls" aria-label="Room controls">
          <div>
            <p className="room-eyebrow">Invitation</p>
            <h2>Bring your table together.</h2>
            <p>Only people with the current private invitation can join.</p>
          </div>
          {invitationUrl ? (
            <button className="primary-button" type="button" disabled={pending} onClick={() => void copyInvitation()}>
              <Icon icon={Copy} /> Copy room link
            </button>
          ) : null}
          {isHost ? (
            <button className="secondary-button" type="button" disabled={pending || !room.control.isController} onClick={onRotateInvitation}>
              <Icon icon={RefreshCw} /> Rotate room invitation
            </button>
          ) : null}
          {!room.control.isController ? (
            <button className="secondary-button" type="button" disabled={pending} onClick={onClaimControl}>
              <Icon icon={Link2} /> Claim control in this tab
            </button>
          ) : null}
          <button className="text-button" type="button" disabled={pending || !room.control.isController} onClick={onLeave}>
            <Icon icon={LogOut} /> Leave room
          </button>
          {message ? <p className="room-control-message" role="status">{message}</p> : null}
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
