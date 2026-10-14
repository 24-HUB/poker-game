'use client';

import type { GameView, PokerAction, RoomView } from '@poker/contracts';
import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Coins, Settings } from 'lucide-react';
import { PokerActionPanel } from './PokerActionPanel';
import { useTurnClock } from './useTurnClock';
import { useActiveRoom } from './ActiveRoomBoundary';

import type { RoomConnectionStatus } from './useRoomConnection';
import { HandResultPanel, resultSummary, WinnerBadge } from './HandResultPanel';
import { PlayingCard } from './PlayingCard';
import { HandCompletionBar } from './HandCompletionBar';

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
  onOpenHistory?: () => void;
};

export function PokerTable({ room, game, accountId, status, pending, message,
  onAction, onEnd, onStart, onLeave, onClaimControl, onRetryPending, onOpenHistory }: PokerTableProps) {
  const [fourColour, setFourColour] = useState(false);
  const tableRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const priorFocus = useRef<Element | null>(null);
  useLayoutEffect(() => {
    if (priorFocus.current && !priorFocus.current.isConnected && document.activeElement === document.body) headingRef.current?.focus();
  }, [game?.handId, game?.handPhase, game?.sessionPhase]);
  const seconds = useTurnClock(game);
  const navigation = useActiveRoom();
  const host = room.hostAccountId === accountId;
  const canStart = host && room.phase === 'waiting' && room.members.filter((member) => member.seat !== null).length >= 2;

  const committed = game?.handResult;
  const result = committed && game && game.sessionPhase !== 'aborted' &&
    (committed.handId === game.handId && (game.handPhase === 'result' || game.handPhase === 'paused') || game.sessionPhase === 'ended' && committed.handNumber === game.handNumber) ? committed : null;
  const completed = !!game && (game.sessionPhase === 'ended' || game.sessionPhase === 'aborted' || !game.handPhase || ['result', 'settling', 'paused'].includes(game.handPhase));
  const names = Object.fromEntries(game?.participants.map((player) => [player.accountId, player.displayName]) ?? []);
  const highlighted = result?.winners.length === 1 ? result.presentation?.rankings.find((rank) => rank.accountId === result.winners[0])?.combinationCards ?? [] : [];
  const board = result?.presentation?.board ?? game?.board ?? [];
  return <section ref={tableRef} onFocusCapture={(event) => { priorFocus.current = event.target; }} className={`poker-table${completed ? ' poker-table--complete' : ''}${fourColour ? ' poker-table--four-colour' : ''}`} aria-label="Poker table">
    <header className="poker-table__header">
      <button type="button" className="poker-lobby-button" onClick={onLeave}><ArrowLeft aria-hidden="true" /> Lobby</button>
      <div><h1 ref={headingRef} tabIndex={-1} title={room.title}>{room.title}</h1>
        <div className="poker-table__details"><p>Hand {game?.handNumber ?? '…'} <span className="poker-street">{game?.sessionPhase === 'ended' ? 'Session complete' : result ? 'Hand complete' : game?.handPhase ?? 'Waiting'}</span> <span aria-label="Blinds">Blinds {game?.smallBlind ?? '…'}/{game?.bigBlind ?? '…'}</span></p>
        <span className={`connection-state connection-state--${status}`}>{status === 'connected' ? 'Connected' : status === 'unavailable' ? 'Service unavailable' : 'Reconnecting'}</span></div></div>
      <div className="poker-table__session-actions">
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
        {result?.presentation ? <p className="poker-table__pot">{result.presentation.outcomeReason === 'fold' ? 'Pot awarded' : 'Final pot'} · {result.presentation.pots.reduce((sum, pot) => sum + pot.amount, 0).toLocaleString('en-US')} chips</p> : null}
        <div className="poker-table__board" role="group" aria-label="Community cards">
          {Array.from({ length: 5 }, (_, index) => board[index] === undefined
            ? <span className="poker-card poker-card--empty" key={index} aria-label="Empty community card slot"><span>{index < 3 ? 'Flop' : index === 3 ? 'Turn' : 'River'}</span></span>
            : <PlayingCard card={board[index]!} key={`${index}:${board[index]}`} community highlighted={highlighted.includes(board[index]!)} />)}
        </div>
        {!result?.presentation ? <p className="poker-table__pot">{game.handPhase === 'result' || game.sessionResult
          ? game.pots.map((pot, index) =>
            `${index === 0 ? 'Main pot' : `Side pot ${index}`}: ${pot.amount} chips`).join(' · ')
          : `Pot: ${game.pots.reduce((total, pot) => total + pot.amount, 0).toLocaleString('en-US')} chips`}</p> : null}
        {result ? <p className="poker-table__outcome">{resultSummary(result, names)}{result.presentation?.outcomeReason === 'fold' ? <small>All opponents folded · No showdown</small> : null}</p> : null}
        </div>
        <ul className="poker-table__seats" aria-label="Players">
          {seatPositions(game, accountId).map(({ participant, position }) => <li key={participant.accountId} data-position={position}
            className={`poker-seat${!completed && participant.accountId === game.actorAccountId ? ' poker-seat--acting' : ''}${result?.winners.includes(participant.accountId) ? ' poker-seat--winner' : ''}`}>
            <div className={`poker-seat__portrait${!completed && participant.accountId === game.actorAccountId ? ' poker-seat__portrait--acting' : ''}${!completed && seconds !== null && seconds <= 5 ? ' poker-seat__portrait--urgent' : ''}`}>
              <img className="poker-seat__avatar" src={participant.equipment?.avatar?.assetUrl ?? '/art/hostess.png'} alt={`${participant.displayName}'s ${participant.equipment?.avatar?.name ?? 'default'} avatar`} width="48" height="48" />
              {!completed && participant.accountId === game.actorAccountId && seconds !== null ? <svg className="poker-seat__clock" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="26" pathLength="100" /><circle cx="28" cy="28" r="26" pathLength="100" strokeDasharray={`${Math.min(100, seconds / 30 * 100)} 100`} /></svg> : null}
            </div>
            <strong><details className="poker-player-name"><summary aria-label={`Player: ${participant.displayName}`}><span className="poker-seat__name">{participant.displayName}</span><span className="poker-seat__stack" aria-label={`Stack: ${result?.finalStacks.find((entry) => entry.accountId === participant.accountId)?.amount ?? participant.stack} chips`}><Coins aria-hidden="true" />{(result?.finalStacks.find((entry) => entry.accountId === participant.accountId)?.amount ?? participant.stack).toLocaleString('en-US')}</span></summary><span>{participant.displayName}</span></details></strong>
            {!completed && participant.streetContribution > 0 ? <span className="poker-seat__bet" aria-label={`${participant.displayName}'s bet: ${participant.streetContribution}`}><Coins aria-hidden="true" />{participant.streetContribution}</span> : null}
            <span className="poker-seat__markers">
              {result?.winners.includes(participant.accountId) ? <WinnerBadge /> : null}
              {participant.accountId === accountId ? <span className="poker-seat__you">(you)</span> : null}
              {participant.folded ? <span>Folded</span> : !completed && participant.allIn ? <span>All-in</span> : !participant.connected ? <span>Disconnected</span> : null}
              {!completed && participant.accountId === game.actorAccountId ? <span className="poker-seat__acting-label">Acting{seconds === null ? '' : ` · ${seconds}s`}</span> : null}
              {participant.seat === game.buttonSeat ? <span className="poker-dealer" aria-label="Dealer">D</span> : null}
              {participant.seat === game.smallBlindSeat ? <span className="poker-blind" aria-label="Small blind">SB</span> : null}
              {participant.seat === game.bigBlindSeat ? <span className="poker-blind" aria-label="Big blind">BB</span> : null}
            </span>
            {(result?.revealedCards.find((entry) => entry.accountId === participant.accountId)?.cards ?? (participant.accountId === accountId ? game.holeCards : null)) ?
              <span className="poker-seat__cards" role="group" aria-label={participant.accountId === accountId ? 'Your cards' : 'Revealed cards'}>
                {(result?.revealedCards.find((entry) => entry.accountId === participant.accountId)?.cards ?? game.holeCards)!.map((card) => <PlayingCard card={card} key={card} highlighted={highlighted.includes(card)} />)}
              </span> : <span className="poker-seat__cards" role="group" aria-label="Hidden cards">{[0, 1].map((index) => <span className="poker-card poker-card--back" key={index} aria-hidden="true">
                {participant.equipment?.cardBack ? <img src={participant.equipment.cardBack.assetUrl} alt="" width="35" height="48" /> : '✦'}</span>)}</span>}
            {result?.presentation?.outcomeReason === 'fold' && participant.accountId === accountId && game.holeCards ? <span className="poker-seat__private-note">Only visible to you</span> : null}
          </li>)}
        </ul>
      </div>
      <p className="sr-only" role="status">{result ? `Hand ${result.handNumber} complete. ${resultSummary(result, names)}` : completed ? '' : `Hand ${game.handNumber} · ${game.handPhase}`}</p>
      {!completed ? <PokerActionPanel key={`${accountId}:${game.sessionId}:${game.handId}`} game={game} accountId={accountId} status={status} pending={pending} message={message} onAction={onAction} onRetryPending={onRetryPending} /> : null}
      {result ? <HandResultPanel result={result} names={names} /> : null}
      {completed ? <><HandCompletionBar game={game} accountId={accountId} status={status} pending={pending || !room.control.isController || !game.control.isController} canStart={canStart} onStart={onStart} onOpenHistory={onOpenHistory} />
        {message ? <p role="status">{message}</p> : null}{pending ? <button type="button" className="secondary-button" disabled={status !== 'connected'} onClick={onRetryPending}>Reconcile uncertain action</button> : null}</> : null}
      {game.sessionResult ? <div className="poker-table__result"><h2>Session standings</h2>
        <p>Session {game.sessionResult.leaderAccountIds.length > 1 ? 'leaders' : 'leader'}: {game.sessionResult.leaderAccountIds.map((id) => names[id] ?? id).join(', ')}</p>
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
