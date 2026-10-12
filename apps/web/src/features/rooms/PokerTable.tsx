'use client';

import type { GameView, PokerAction, RoomView } from '@poker/contracts';
import { PokerActionPanel } from './PokerActionPanel';

import type { RoomConnectionStatus } from './useRoomConnection';
import { HandReward } from '../wallet/HandReward';

const ranks = '23456789TJQKA';
const suits = ['♣', '♦', '♥', '♠'] as const;

function cardLabel(card: number): string { return `${ranks[card % 13]}${suits[Math.floor(card / 13)]}`; }
function cardColor(card: number): string { return Math.floor(card / 13) === 1 || Math.floor(card / 13) === 2 ? 'red' : 'black'; }

export type PokerTableProps = {
  room: RoomView;
  game: GameView | null;
  accountId: string;
  status: RoomConnectionStatus;
  pending: boolean;
  message: string | null;
  onAction: (action: PokerAction) => void;
  onEnd: () => void;
  onStart: () => void;
  onLeave: () => void;
  onClaimControl: () => void;
  onRetryPending: () => void;
};

export function PokerTable({ room, game, accountId, status, pending, message,
  onAction, onEnd, onStart, onLeave, onClaimControl, onRetryPending }: PokerTableProps) {
  const host = room.hostAccountId === accountId;
  const canStart = host && room.phase === 'waiting' && room.members.filter((member) => member.seat !== null).length >= 2;

  return <section className="poker-table" aria-label="Poker table">
    <header className="poker-table__header">
      <div><h1>{room.title}</h1>
        <div className="poker-table__details"><p>Hand {game?.handNumber ?? '…'} · {game?.handPhase ?? 'Waiting for the next hand'} · Blinds {game?.smallBlind ?? '…'}/{game?.bigBlind ?? '…'}</p>
        <span className={`connection-state connection-state--${status}`}>{status === 'connected' ? 'Connected' : status === 'unavailable' ? 'Service unavailable' : 'Reconnecting'}</span></div></div>
      <div className="poker-table__session-actions">
        {canStart ? <button type="button" className="primary-button" disabled={pending || status !== 'connected' || !room.control.isController} onClick={onStart}>Start new session</button> : null}
        {!room.control.isController ? <><p>You are watching from this tab. Take over to play or leave.</p><button type="button" className="secondary-button" disabled={pending || status !== 'connected'} onClick={onClaimControl}>Use this tab to play</button></> : null}
        <details className="room-options"><summary>Room options</summary>
          {host && game?.sessionPhase !== 'ended' ? <><button type="button" className="secondary-button" disabled={pending || !room.control.isController || status !== 'connected' || game?.sessionPhase === 'ending'} onClick={onEnd}>End after this hand</button>
            {game?.sessionPhase === 'ending' ? <p>Ending requested. This hand will finish first.</p> : !room.control.isController ? <p>Use this tab to play to manage the session.</p> : null}</> : null}
          <button type="button" className="text-button" disabled={pending || status !== 'connected' || !room.control.isController} onClick={onLeave}>Leave room</button>
        </details>
      </div>
    </header>
    {!game ? <p role="status">Synchronizing the hand…</p> : <>
      <div className="poker-table__felt">
        <div className="poker-table__center">
        <div className="poker-table__board" aria-label="Community cards">
          {Array.from({ length: 5 }, (_, index) => game.board[index] === undefined
            ? <span className="poker-card poker-card--back" key={index} aria-label="Undealt card">✦</span>
            : <span className={`poker-card poker-card--${cardColor(game.board[index]!)}`} key={index}>{cardLabel(game.board[index]!)}</span>)}
        </div>
        <p className="poker-table__pot">{game.handPhase === 'result' || game.sessionResult
          ? game.pots.map((pot, index) =>
            `${index === 0 ? 'Main pot' : `Side pot ${index}`}: ${pot.amount} chips`).join(' · ')
          : `Pot: ${game.pots.reduce((total, pot) => total + pot.amount, 0)} chips`}</p>
        </div>
        <ul className="poker-table__seats" aria-label="Players">
          {seatPositions(game, accountId).map(({ participant, position }) => <li key={participant.accountId} data-position={position}
            className={participant.accountId === game.actorAccountId ? 'poker-seat poker-seat--acting' : 'poker-seat'}>
            {participant.equipment?.avatar ? <img className="poker-seat__avatar" src={participant.equipment.avatar.assetUrl} alt={`${participant.displayName}'s ${participant.equipment.avatar.name} avatar`} width="48" height="48" /> : null}
            <strong title={participant.displayName}><span className="poker-seat__name">{participant.displayName}</span>{participant.accountId === accountId ? <span className="poker-seat__you"> (you)</span> : null}</strong>
            <span className="poker-seat__stack">Stack: {participant.stack} chips</span>
            <span className="poker-seat__bet">Bet: {participant.streetContribution}</span>
            <small>{participant.folded ? 'Folded' : participant.allIn ? 'All-in' : participant.connected ? 'At table' : 'Disconnected'}
              {participant.accountId === game.actorAccountId ? ' · Acting' : ''}
              {participant.seat === game.buttonSeat ? ' · Dealer' : ''}
              {participant.seat === game.smallBlindSeat ? ' · SB' : ''}
              {participant.seat === game.bigBlindSeat ? ' · BB' : ''}</small>
            {participant.accountId === accountId && game.holeCards ? <span className="poker-seat__cards" aria-label="Your cards">
              {game.holeCards.map((card) => <span className={`poker-card poker-card--${cardColor(card)}`} key={card}>{cardLabel(card)}</span>)}
            </span> : <span className="poker-seat__cards" aria-label="Hidden cards">{[0, 1].map((index) => <span className="poker-card poker-card--back" key={index}>
              {participant.equipment?.cardBack ? <img src={participant.equipment.cardBack.assetUrl} alt="" width="35" height="48" /> : '✦'}</span>)}</span>}
          </li>)}
        </ul>
      </div>
      <PokerActionPanel key={`${accountId}:${game.sessionId}:${game.handId}`} game={game} accountId={accountId} status={status} pending={pending} message={message} onAction={onAction} onRetryPending={onRetryPending} />
      {game.handResult ? <div className="poker-table__result"><h2>Hand result</h2>
        <p>Winner: {game.handResult.winners.map((id) => game.participants.find((player) => player.accountId === id)?.displayName ?? id).join(', ')}</p>
        <HandReward receipt={game.handResult.rewardReceipts?.find((receipt) => receipt.accountId === accountId)} />
        {game.revealedCards.length ? <p>Showdown: {game.revealedCards.map((entry) => `${game.participants.find((player) => player.accountId === entry.accountId)?.displayName ?? entry.accountId} ${entry.cards.map(cardLabel).join(' ')}`).join(' · ')}</p> : null}
      </div> : null}
      {game.sessionResult ? <div className="poker-table__result"><h2>Session standings</h2>
        <ol>{[...game.sessionResult.standings].sort((a, b) => b.stack - a.stack).map((entry) => <li key={entry.accountId}>
          {game.participants.find((player) => player.accountId === entry.accountId)?.displayName ?? entry.accountId}: {entry.stack} chips
        </li>)}</ol></div> : null}
    </>}
  </section>;
}

function seatPositions(game: GameView, accountId: string) {
  const sorted = [...game.participants].sort((a, b) => a.seat - b.seat);
  const own = sorted.findIndex((player) => player.accountId === accountId);
  const ordered = [...sorted.slice(Math.max(0, own)), ...sorted.slice(0, Math.max(0, own))];
  const positions: Record<number, string[]> = {
    2: ['bottom', 'top'], 3: ['bottom', 'top-left', 'top-right'],
    4: ['bottom', 'top-left', 'top', 'top-right'], 5: ['bottom', 'bottom-left', 'top-left', 'top-right', 'bottom-right'],
    6: ['bottom', 'bottom-left', 'top-left', 'top', 'top-right', 'bottom-right'],
  };
  return ordered.map((participant, index) => ({ participant, position: positions[ordered.length]?.[index] ?? 'bottom' }));
}
