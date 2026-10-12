'use client';

import type { GameView, PokerAction } from '@poker/contracts';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { RoomConnectionStatus } from './useRoomConnection';
import { useTurnClock } from './useTurnClock';

export type PokerActionPanelProps = {
  game: GameView; accountId: string; status: RoomConnectionStatus; pending: boolean;
  message: string | null; onAction: (action: PokerAction) => void; onRetryPending: () => void;
};

export function PokerActionPanel({ game, accountId, status, pending, message, onAction, onRetryPending }: PokerActionPanelProps) {
  const [amount, setAmount] = useState(String(game.legalActions.raise?.minRaiseTo ?? ''));
  const [sending, setSending] = useState(false);
  const submitted = useRef(false);
  const edited = useRef(false);
  const seconds = useTurnClock(game);
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
  const waitingLabel = `${actor?.displayName ?? 'Another player'} is acting`;
  const ownTurn = game.actorAccountId === accountId;
  const settled = game.handPhase === null || ['paused', 'settling', 'result'].includes(game.handPhase);
  const reason = status !== 'connected' ? 'Reconnecting: actions are unavailable until the table is synchronized.'
    : !game.control.isController ? 'You are watching from this tab. Use this tab to play before acting.'
      : pending || sending ? 'Submitting your action. Wait for confirmation; reconcile an uncertain result.'
        : game.sessionPhase === 'aborted' ? 'Session interrupted. Betting is unavailable.'
          : game.sessionPhase === 'ended' ? 'Session complete. The host can start a new session.'
          : settled ? game.handPhase === 'paused' ? 'Settlement paused. Retrying safely.' : 'Waiting for the next hand.'
            : !ownTurn ? waitingLabel : null;
  const canAct = reason === null;
  const raiseLabel = game.currentBet === 0 ? 'Bet' : 'Raise';
  const own = game.participants.find((player) => player.accountId === accountId);
  const displayCall = legal.callAmount || Math.min(own?.stack ?? 0, Math.max(0, game.currentBet - (own?.streetContribution ?? 0)));
  const showEditor = ownTurn && !settled && game.control.isController && raise !== null;
  const percent = raise && valid && raise.maxRaiseTo !== raise.minRaiseTo ? (selected - raise.minRaiseTo) / (raise.maxRaiseTo - raise.minRaiseTo) * 100 : 0;

  function potPreset(fraction: number) {
    if (!raise) return;
    // A pot-sized raise includes the call before sizing the raise increment.
    const potAfterCall = game.pots.reduce((sum, pot) => sum + pot.amount, 0) + legal.callAmount;
    const target = game.currentBet + Math.floor(potAfterCall * fraction);
    const stepped = raise.minRaiseTo + Math.floor((target - raise.minRaiseTo) / raise.amountStep) * raise.amountStep;
    edit(String(raise.shortAllInOnly ? raise.maxRaiseTo : Math.min(raise.maxRaiseTo, Math.max(raise.minRaiseTo, stepped))));
  }

  function edit(value: string) { edited.current = true; setAmount(value); }
  function submit(action: PokerAction) {
    if (!canAct || submitted.current) return;
    submitted.current = true; setSending(true); onAction(action);
  }
  return <section className="poker-table__action-panel" aria-label="Poker actions">
    <div className={`poker-turn${reason === waitingLabel ? ' poker-turn--waiting' : ''}`}>
      <p role="status" title={reason === waitingLabel ? waitingLabel : undefined}>{canAct ? <strong>Your turn</strong> : reason ?? waitingLabel}</p>
      {seconds === null ? null : <span className={`poker-turn__timer${seconds <= 5 ? ' poker-turn__timer--urgent' : ''}`} aria-label="Time remaining" aria-live="off">{seconds}s</span>}
      {game.actorAccountId && !ownTurn && reason !== waitingLabel ? <span>Turn: {actor?.displayName ?? 'Player'}</span> : null}
    </div>
    {game.sessionPhase === 'ending' ? <p role="status">The session will end after this hand.</p> : null}
    <div className="poker-table__actions">
      <button type="button" className="fold-action" disabled={!canAct || !legal.canFold} onClick={() => submit({ type: 'fold' })}>Fold</button>
      <button type="button" disabled={!canAct || !(legal.canCheck || legal.callAmount > 0)} onClick={() => submit({ type: legal.canCheck ? 'check' : 'call' })}>{legal.canCheck || displayCall === 0 ? 'Check' : `Call ${displayCall}`}</button>
      <button type="button" className="poker-raise-action" disabled={!canAct || !valid} onClick={() => submit({ type: 'raise', raiseTo: selected })}>{ownTurn && raise && Number.isSafeInteger(selected) && amount !== '' ? `${raiseLabel}${raiseLabel === 'Raise' ? ' to' : ''} ${selected}` : 'Raise'}</button>
    </div>
    {showEditor ? <div className="poker-amount-controls">
        <label htmlFor="raise-to">Raise to</label>
        <input id="raise-to" type="number" inputMode="numeric" min={raise?.minRaiseTo} max={raise?.maxRaiseTo} step={raise?.amountStep ?? 1}
          value={amount} placeholder={`${raise.minRaiseTo}–${raise.maxRaiseTo}`} disabled={!canAct} aria-invalid={Boolean(raise && !valid)} aria-describedby="raise-guidance" onChange={(event) => edit(event.target.value)} />
        <output className="poker-amount-value" htmlFor="raise-slider">{valid ? selected : '—'}</output>
        <input type="range" aria-label="Raise amount" min={raise?.minRaiseTo ?? 0} max={raise?.maxRaiseTo ?? 0} step={raise?.amountStep ?? 1}
          id="raise-slider" style={{ '--range-fill': `${percent}%` } as CSSProperties} value={valid ? selected : raise?.minRaiseTo ?? 0} disabled={!canAct} onChange={(event) => edit(event.target.value)} />
        <div className="poker-amount-presets">
          <button type="button" disabled={!canAct || !raise} onClick={() => raise && edit(String(raise.minRaiseTo))}>Minimum</button>
          <button type="button" disabled={!canAct || !raise} onClick={() => raise && edit(String(raise.maxRaiseTo))}>Maximum</button>
          <button type="button" disabled={!canAct} onClick={() => potPreset(.5)}>½ pot</button>
          <button type="button" disabled={!canAct} onClick={() => potPreset(1)}>Pot</button>
          <button type="button" disabled={!canAct} onClick={() => edit(String(raise.maxRaiseTo))}>All-in</button>
        </div>
        <p id="raise-guidance">{raise ? !valid ? `Enter a whole-chip amount from ${raise.minRaiseTo} to ${raise.maxRaiseTo} in steps of ${raise.amountStep}.`
          : raise.shortAllInOnly ? `Short all-in only: ${raise.maxRaiseTo} chips total.` : `${raise.minRaiseTo}–${raise.maxRaiseTo} chips total, including your current bet.` : 'Betting is unavailable for this turn.'}</p>
      </div> : null}
    {message ? <p className="room-control-message" role="alert">{message}</p> : null}
    {pending ? <button type="button" className="secondary-button" onClick={onRetryPending}>Reconcile pending game action</button> : null}
  </section>;
}
