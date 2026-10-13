'use client';

import type { GameView, PokerAction, RoomView } from '@poker/contracts';
import { useState } from 'react';
import { ArrowLeft, Coins, Settings, X } from 'lucide-react';
import { PokerActionPanel } from './PokerActionPanel';
import { useTurnClock } from './useTurnClock';
import { useActiveRoom } from './ActiveRoomBoundary';

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
  const [fourColour, setFourColour] = useState(false);
  const [dismissedResult, setDismissedResult] = useState<string | null>(null);
  const seconds = useTurnClock(game);
  const navigation = useActiveRoom();
  const host = room.hostAccountId === accountId;
  const canStart = host && room.phase === 'waiting' && room.members.filter((member) => member.seat !== null).length >= 2;

  const committed = game?.handResult;
  const result = committed && game && (committed.handId === game.handId || game.sessionPhase === 'ended' && committed.handNumber === game.handNumber)
    && committed.handId !== dismissedResult ? committed : null;
  return <section className={`poker-table${fourColour ? ' poker-table--four-colour' : ''}`} aria-label="Poker table">
    <header className="poker-table__header">
      <button type="button" className="poker-lobby-button" onClick={onLeave}><ArrowLeft aria-hidden="true" /> Lobby</button>
      <div><h1 title={room.title}>{room.title}</h1>
        <div className="poker-table__details"><p>Hand {game?.handNumber ?? '…'} <span className="poker-street">{game?.handPhase ?? 'Waiting'}</span> <span aria-label="Blinds">{game?.smallBlind ?? '…'}/{game?.bigBlind ?? '…'}</span></p>
        <span className={`connection-state connection-state--${status}`}>{status === 'connected' ? 'Connected' : status === 'unavailable' ? 'Service unavailable' : 'Reconnecting'}</span></div></div>
      <div className="poker-table__session-actions">
        {canStart ? <button type="button" className="primary-button" disabled={pending || status !== 'connected' || !room.control.isController} onClick={onStart}>Start new session</button> : null}
        {!room.control.isController ? <><p>You are watching from this tab. Take over to play or leave.</p><button type="button" className="secondary-button" disabled={pending || status !== 'connected'} onClick={onClaimControl}>Use this tab to play</button></> : null}
        <details className="room-options"><summary aria-label="Room options"><Settings aria-hidden="true" /><span className="sr-only">Room options</span></summary>
          <label className="poker-suit-option"><input type="checkbox" checked={fourColour} onChange={(event) => setFourColour(event.target.checked)} /> Four-colour suits</label>
          {host && game?.sessionPhase !== 'ended' ? <><button type="button" className="secondary-button" disabled={pending || !room.control.isController || status !== 'connected' || game?.sessionPhase === 'ending'} onClick={onEnd}>End after this hand</button>
            {game?.sessionPhase === 'ending' ? <p>Ending requested. This hand will finish first.</p> : !room.control.isController ? <p>Use this tab to play to manage the session.</p> : null}</> : null}
          <button type="button" className="text-button" disabled={pending || status !== 'connected' || !room.control.isController} onClick={onLeave}>Leave room</button>
          {navigation ? <><button type="button" className="text-button" onClick={() => navigation.navigate('/collection')}>Collection</button><button type="button" className="text-button" onClick={() => navigation.navigate('/pulls')}>Cosmetic pulls</button></> : null}
        </details>
      </div>
    </header>
    {!game ? <p role="status">Synchronizing the hand…</p> : <>
      <div className="poker-table__felt">
        <div className="poker-table__center">
        <div className="poker-table__board" aria-label="Community cards">
          {Array.from({ length: 5 }, (_, index) => game.board[index] === undefined
            ? <span className="poker-card poker-card--empty" key={index} aria-label="Empty community card slot" />
            : <Card card={game.board[index]!} key={`${index}:${game.board[index]}`} community />)}
        </div>
        <p className="poker-table__pot">{game.handPhase === 'result' || game.sessionResult
          ? game.pots.map((pot, index) =>
            `${index === 0 ? 'Main pot' : `Side pot ${index}`}: ${pot.amount} chips`).join(' · ')
          : `Pot: ${game.pots.reduce((total, pot) => total + pot.amount, 0)} chips`}</p>
        </div>
        <ul className="poker-table__seats" aria-label="Players">
          {seatPositions(game, accountId).map(({ participant, position }) => <li key={participant.accountId} data-position={position}
            className={participant.accountId === game.actorAccountId ? 'poker-seat poker-seat--acting' : 'poker-seat'}>
            <div className={`poker-seat__portrait${participant.accountId === game.actorAccountId ? ' poker-seat__portrait--acting' : ''}${seconds !== null && seconds <= 5 ? ' poker-seat__portrait--urgent' : ''}`}>
              <img className="poker-seat__avatar" src={participant.equipment?.avatar?.assetUrl ?? '/art/hostess.png'} alt={`${participant.displayName}'s ${participant.equipment?.avatar?.name ?? 'default'} avatar`} width="48" height="48" />
              {participant.accountId === game.actorAccountId && seconds !== null ? <svg className="poker-seat__clock" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="26" pathLength="100" /><circle cx="28" cy="28" r="26" pathLength="100" strokeDasharray={`${Math.min(100, seconds / 30 * 100)} 100`} /></svg> : null}
            </div>
            <strong><details className="poker-player-name"><summary aria-label={`Player: ${participant.displayName}`}><span className="poker-seat__name">{participant.displayName}</span><span className="poker-seat__stack" aria-label={`Stack: ${participant.stack} chips`}><Coins aria-hidden="true" />{participant.stack}</span></summary><span>{participant.displayName}</span></details></strong>
            {participant.streetContribution > 0 ? <span className="poker-seat__bet" aria-label={`${participant.displayName}'s bet: ${participant.streetContribution}`}><Coins aria-hidden="true" />{participant.streetContribution}</span> : null}
            <span className="poker-seat__markers">
              {participant.accountId === accountId ? <span className="poker-seat__you">(you)</span> : null}
              {participant.folded ? <span>Folded</span> : participant.allIn ? <span>All-in</span> : !participant.connected ? <span>Disconnected</span> : null}
              {participant.accountId === game.actorAccountId ? <span className="poker-seat__acting-label">Acting{seconds === null ? '' : ` · ${seconds}s`}</span> : null}
              {participant.seat === game.buttonSeat ? <span className="poker-dealer" aria-label="Dealer">D</span> : null}
              {participant.seat === game.smallBlindSeat ? <span className="poker-blind" aria-label="Small blind">SB</span> : null}
              {participant.seat === game.bigBlindSeat ? <span className="poker-blind" aria-label="Big blind">BB</span> : null}
            </span>
            {participant.accountId === accountId && game.holeCards ? <span className="poker-seat__cards" aria-label="Your cards">
              {game.holeCards.map((card) => <Card card={card} key={card} />)}
            </span> : <span className="poker-seat__cards" aria-label="Hidden cards">{[0, 1].map((index) => <span className="poker-card poker-card--back" key={index}>
              {participant.equipment?.cardBack ? <img src={participant.equipment.cardBack.assetUrl} alt="" width="35" height="48" /> : '✦'}</span>)}</span>}
          </li>)}
        </ul>
      </div>
      <PokerActionPanel key={`${accountId}:${game.sessionId}:${game.handId}`} game={game} accountId={accountId} status={status} pending={pending} message={message} onAction={onAction} onRetryPending={onRetryPending} />
      {result ? <div className="poker-table__result poker-result-toast" role="status"><button type="button" aria-label="Dismiss hand result" onClick={() => setDismissedResult(result.handId)}><X aria-hidden="true" /></button><h2>Hand {result.handNumber} result</h2>
        <p>Winner: {result.winners.map((id) => game.participants.find((player) => player.accountId === id)?.displayName ?? id).join(', ')}</p>
        <HandReward receipt={result.rewardReceipts?.find((receipt) => receipt.accountId === accountId)} />
        {result.revealedCards.length ? <p>Showdown: {result.revealedCards.map((entry) => `${game.participants.find((player) => player.accountId === entry.accountId)?.displayName ?? entry.accountId} ${entry.cards.map(cardLabel).join(' ')}`).join(' · ')}</p> : null}
      </div> : null}
      {game.sessionResult ? <div className="poker-table__result"><h2>Session standings</h2>
        <ol>{[...game.sessionResult.standings].sort((a, b) => b.stack - a.stack).map((entry) => <li key={entry.accountId}>
          {game.participants.find((player) => player.accountId === entry.accountId)?.displayName ?? entry.accountId}: {entry.stack} chips
        </li>)}</ol></div> : null}
    </>}
  </section>;
}

function Card({ card, community = false }: { card: number; community?: boolean }) {
  return <span aria-label={cardLabel(card)} className={`poker-card poker-card--${cardColor(card)} poker-card--suit-${Math.floor(card / 13)}${community ? ' poker-card--dealt' : ''}`}><span>{ranks[card % 13]}</span><span>{suits[Math.floor(card / 13)]}</span></span>;
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
