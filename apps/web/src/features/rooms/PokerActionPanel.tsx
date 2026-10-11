'use client';

import type { GameView, PokerAction } from '@poker/contracts';
import { useEffect, useRef, useState } from 'react';
import type { RoomConnectionStatus } from './useRoomConnection';

export type PokerActionPanelProps = {
  game: GameView; accountId: string; status: RoomConnectionStatus; pending: boolean;
  message: string | null; onAction: (action: PokerAction) => void; onRetryPending: () => void;
};

export function PokerActionPanel({ game, accountId, status, pending, message, onAction, onRetryPending }: PokerActionPanelProps) {
  const [amount, setAmount] = useState(String(game.legalActions.raise?.minRaiseTo ?? ''));
  const [sending, setSending] = useState(false);
  const submitted = useRef(false);
  const edited = useRef(false);
  const [now, setNow] = useState(Date.now());
  const [offset, setOffset] = useState(() => Date.parse(game.serverTime) - Date.now());
  useEffect(() => { setOffset(Date.parse(game.serverTime) - Date.now()); }, [game.serverTime]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!pending) { submitted.current = false; setSending(false); }
  }, [pending, game.gameVersion, game.handId, message]);
  useEffect(() => {
    if (!edited.current && game.legalActions.raise) setAmount(String(game.legalActions.raise.minRaiseTo));
  }, [game.legalActions.raise?.minRaiseTo]);

  const legal = game.legalActions;
  const raise = legal.raise;
  const selected = Number(amount);
  const valid = raise && amount.trim() !== '' && Number.isSafeInteger(selected) &&
    selected >= raise.minRaiseTo && selected <= raise.maxRaiseTo &&
    (selected - raise.minRaiseTo) % raise.amountStep === 0 && (!raise.shortAllInOnly || selected === raise.maxRaiseTo);
  const actor = game.participants.find((player) => player.accountId === game.actorAccountId);
  const ownTurn = game.actorAccountId === accountId;
  const settled = game.handPhase === null || ['paused', 'settling', 'result'].includes(game.handPhase);
  const reason = status !== 'connected' ? 'Reconnecting: actions are unavailable until the table is synchronized.'
    : !game.control.isController ? 'You are watching from this tab. Use this tab to play before acting.'
      : pending || sending ? 'Submitting your action. Wait for confirmation; reconcile an uncertain result.'
        : game.sessionPhase === 'aborted' ? 'Session interrupted. Betting is unavailable.'
          : game.sessionPhase === 'ended' ? 'Session complete. The host can start a new session.'
          : settled ? game.handPhase === 'paused' ? 'Settlement paused. Retrying safely.' : 'Waiting for the next hand.'
            : !ownTurn ? `Waiting for ${actor?.displayName ?? 'another player'}` : null;
  const canAct = reason === null;
  const seconds = game.deadline ? Math.max(0, Math.ceil((Date.parse(game.deadline) - now - offset) / 1000)) : null;
  const raiseLabel = game.currentBet === 0 ? 'Bet' : 'Raise';

  function edit(value: string) { edited.current = true; setAmount(value); }
  function submit(action: PokerAction) {
    if (!canAct || submitted.current) return;
    submitted.current = true; setSending(true); onAction(action);
  }
  return <section className="poker-table__action-panel" aria-label="Poker actions">
    <div className="poker-turn">
      <p role="status">{ownTurn && !settled ? <strong>Your turn</strong> : reason ?? `Waiting for ${actor?.displayName ?? 'another player'}`}</p>
      {game.actorAccountId ? <span>Turn: {actor?.displayName ?? 'Player'}</span> : null}
      {seconds === null ? null : <span aria-label="Time remaining" aria-live="off">{seconds}s left</span>}
    </div>
    {game.sessionPhase === 'ending' ? <p role="status">The session will end after this hand.</p> : null}
    {reason && ownTurn && !settled ? <p>{reason}</p> : null}
    <div className="poker-table__actions">
      <div className="poker-basic-actions">
        {legal.canFold ? <button type="button" className="fold-action" disabled={!canAct} onClick={() => submit({ type: 'fold' })}>Fold</button> : null}
        {legal.canCheck ? <button type="button" disabled={!canAct} onClick={() => submit({ type: 'check' })}>Check</button> : null}
        {legal.callAmount > 0 ? <button type="button" disabled={!canAct} onClick={() => submit({ type: 'call' })}>Call {legal.callAmount}</button> : null}
      </div>
      <div className="poker-amount-controls">
        <label htmlFor="raise-to">Raise to</label>
        <input id="raise-to" type="number" inputMode="numeric" min={raise?.minRaiseTo} max={raise?.maxRaiseTo} step={raise?.amountStep ?? 1}
          value={amount} disabled={!canAct || !raise} aria-invalid={Boolean(raise && !valid)} aria-describedby="raise-guidance" onChange={(event) => edit(event.target.value)} />
        <input type="range" aria-label="Raise amount" min={raise?.minRaiseTo ?? 0} max={raise?.maxRaiseTo ?? 0} step={raise?.amountStep ?? 1}
          value={valid ? selected : raise?.minRaiseTo ?? 0} disabled={!canAct || !raise} onChange={(event) => edit(event.target.value)} />
        <div className="poker-amount-presets">
          <button type="button" disabled={!canAct || !raise} onClick={() => raise && edit(String(raise.minRaiseTo))}>Minimum</button>
          <button type="button" disabled={!canAct || !raise} onClick={() => raise && edit(String(raise.maxRaiseTo))}>Maximum</button>
        </div>
        <button type="button" className="poker-raise-action" disabled={!canAct || !valid} onClick={() => submit({ type: 'raise', raiseTo: selected })}>{raiseLabel}{Number.isSafeInteger(selected) && amount !== '' ? ` ${selected}` : ''}</button>
        <p id="raise-guidance">{raise ? !valid ? `Enter a whole-chip amount from ${raise.minRaiseTo} to ${raise.maxRaiseTo} in steps of ${raise.amountStep}.`
          : raise.shortAllInOnly ? `Short all-in only: ${raise.maxRaiseTo} chips total.` : `${raise.minRaiseTo}–${raise.maxRaiseTo} chips total, including your current bet.` : 'Betting is unavailable for this turn.'}</p>
      </div>
    </div>
    {message ? <p className="room-control-message" role="alert">{message}</p> : null}
    {pending ? <button type="button" className="secondary-button" onClick={onRetryPending}>Reconcile pending game action</button> : null}
  </section>;
}
