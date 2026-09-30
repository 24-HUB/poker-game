'use client';

import type { GameView, PokerAction, RoomView } from '@poker/contracts';
import { useEffect, useMemo, useState } from 'react';

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
  const [raiseTo, setRaiseTo] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  const offset = useMemo(() => game ? Date.parse(game.serverTime) - Date.now() : 0, [game?.serverTime]);
  const seconds = game?.deadline ? Math.max(0, Math.ceil((Date.parse(game.deadline) - now - offset) / 1000)) : null;
  const canAct = status === 'connected' && !pending &&
    (game?.sessionPhase === 'playing' || game?.sessionPhase === 'ending') &&
    game.control.isController && game.actorAccountId === accountId &&
    game.handPhase !== 'paused' && game.handPhase !== 'settling' && game.handPhase !== 'result';
  const legal = game?.legalActions;
  const raise = legal?.raise;
  const amount = Number(raiseTo);
  const validRaise = raise && Number.isSafeInteger(amount) && amount >= raise.minRaiseTo && amount <= raise.maxRaiseTo;
  const host = room.hostAccountId === accountId;
  const canStart = host && room.phase === 'waiting' && room.members.filter((member) => member.seat !== null).length >= 2;

  return <section className="poker-table" aria-label="Poker table">
    <header className="poker-table__header">
      <div><p className="room-eyebrow">Private poker · hand {game?.handResult?.handNumber ?? 1}</p>
        <h1>{room.title}</h1><p>{game?.handPhase ?? 'Waiting for the next hand'} · {status}</p></div>
      <div className="poker-table__session-actions">
        {canStart ? <button type="button" className="primary-button" disabled={pending || status !== 'connected'} onClick={onStart}>Start new session</button> : null}
        {host && game?.sessionPhase !== 'ended' ? <button type="button" className="secondary-button" disabled={pending || !room.control.isController} onClick={onEnd}>End after this hand</button> : null}
        {!room.control.isController ? <button type="button" className="secondary-button" onClick={onClaimControl}>Claim control</button> : null}
        <button type="button" className="text-button" onClick={onLeave}>Leave room</button>
      </div>
    </header>
    {!game ? <p role="status">Synchronizing the hand…</p> : <>
      <div className="poker-table__felt">
        <div className="poker-table__board" aria-label="Community cards">
          {Array.from({ length: 5 }, (_, index) => game.board[index] === undefined
            ? <span className="poker-card poker-card--back" key={index} aria-label="Undealt card">✦</span>
            : <span className={`poker-card poker-card--${cardColor(game.board[index]!)}`} key={index}>{cardLabel(game.board[index]!)}</span>)}
        </div>
        <p className="poker-table__pot">Pots: {game.pots.length ? game.pots.map((pot) => pot.amount).join(' / ') : '0'} chips</p>
        <ul className="poker-table__seats" aria-label="Players">
          {game.participants.map((participant) => <li key={participant.accountId}
            className={participant.accountId === game.actorAccountId ? 'poker-seat poker-seat--acting' : 'poker-seat'}>
            <strong>{participant.displayName}{participant.accountId === accountId ? ' (you)' : ''}</strong>
            <span>{participant.stack} chips · bet {participant.streetContribution}</span>
            <small>{participant.folded ? 'Folded' : participant.allIn ? 'All in' : participant.connected ? 'At table' : 'Reconnecting'}
              {participant.seat === game.buttonSeat ? ' · Button' : ''}</small>
            {participant.accountId === accountId && game.holeCards ? <span className="poker-seat__cards" aria-label="Your cards">
              {game.holeCards.map((card) => <span className={`poker-card poker-card--${cardColor(card)}`} key={card}>{cardLabel(card)}</span>)}
            </span> : <span className="poker-seat__cards" aria-label="Hidden cards"><span className="poker-card poker-card--back">✦</span><span className="poker-card poker-card--back">✦</span></span>}
          </li>)}
        </ul>
      </div>
      <div className="poker-table__action-panel">
        <p role="status">{game.handPhase === 'paused' ? 'Settlement paused. Retrying safely.' :
          game.sessionPhase === 'ending' ? 'The session will end after this hand.' :
            game.actorAccountId ? `Turn: ${game.participants.find((player) => player.accountId === game.actorAccountId)?.displayName ?? 'Player'}${seconds === null ? '' : ` · ${seconds}s left`}` : 'Waiting for the next hand'}</p>
        <div className="poker-table__actions">
          {legal?.canFold ? <button type="button" disabled={!canAct} onClick={() => onAction({ type: 'fold' })}>Fold</button> : null}
          {legal?.canCheck ? <button type="button" disabled={!canAct} onClick={() => onAction({ type: 'check' })}>Check</button> : null}
          {legal && legal.callAmount > 0 ? <button type="button" disabled={!canAct} onClick={() => onAction({ type: 'call' })}>Call {legal.callAmount}</button> : null}
          {raise ? <label>Raise to
            <input type="number" min={raise.minRaiseTo} max={raise.maxRaiseTo} step="1" value={raiseTo}
              disabled={!canAct} onChange={(event) => setRaiseTo(event.target.value)} />
            <span>{raise.shortAllInOnly ? 'Short all in only' : `${raise.minRaiseTo}–${raise.maxRaiseTo} chips`}</span>
            <button type="button" disabled={!canAct || !validRaise} onClick={() => onAction({ type: 'raise', raiseTo: amount })}>Raise</button>
          </label> : null}
        </div>
        {message ? <p className="room-control-message" role="alert">{message}</p> : null}
        {pending ? <button type="button" className="secondary-button" onClick={onRetryPending}>Reconcile pending game action</button> : null}
      </div>
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
