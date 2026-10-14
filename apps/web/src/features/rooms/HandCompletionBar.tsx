'use client';
import type { GameView } from '@poker/contracts';
import { HandReward } from '../wallet/HandReward';
import { useTurnClock } from './useTurnClock';
import type { RoomConnectionStatus } from './useRoomConnection';

export function HandCompletionBar({ game, accountId, status, pending, canStart, onStart, onOpenHistory }: {
  game: GameView; accountId: string; status: RoomConnectionStatus; pending: boolean; canStart: boolean; onStart: () => void; onOpenHistory?: () => void;
}) {
  const seconds = useTurnClock(game, game.nextTransitionAt);
  const text = game.sessionPhase === 'aborted' ? 'Session interrupted'
    : status !== 'connected' ? 'Reconnecting · Waiting for table synchronization'
      : game.handPhase === 'paused' ? 'Result confirmation paused'
        : game.handPhase === 'settling' ? 'Confirming hand result…'
          : game.sessionPhase === 'ended' ? 'Session complete'
            : game.sessionPhase === 'ending' || game.nextTransition === 'session-end' ? 'Finishing session…'
              : game.nextTransition === 'next-hand' && seconds !== null ? seconds > 0 ? `Next hand in ${seconds}s` : 'Starting next hand…'
                : 'Hand complete · Waiting for server';
  const currentResult = game.sessionPhase !== 'aborted' && game.handResult &&
    (game.handResult.handId === game.handId || game.sessionPhase === 'ended' && game.handResult.handNumber === game.handNumber) ? game.handResult : null;
  return <div className="hand-completion">
    <div><strong aria-live="off">{text}</strong>{currentResult ? <HandReward announce={false} receipt={currentResult.rewardReceipts?.find((receipt) => receipt.accountId === accountId)} /> : null}</div>
    <div className="hand-completion__actions"><a className="text-button" href="#hand-history" onClick={onOpenHistory}>View hand history</a>
      {game.sessionPhase === 'ended' ? canStart ? <button type="button" className="primary-button" disabled={pending || status !== 'connected'} onClick={onStart}>Start new session</button> : <span>Waiting for host</span> : null}</div>
  </div>;
}
