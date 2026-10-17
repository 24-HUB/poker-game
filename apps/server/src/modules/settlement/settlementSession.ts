import type { ClientSession, Db } from 'mongodb';
import type { SettlementCandidate } from './settlement.service';
import type { SessionParticipant } from '../rooms/session.repository';
import { SettlementError } from './settlement.error';

/** This check must precede even out-of-transaction wallet preparation. */
export async function validateSettlementSession(db: Db, candidate: SettlementCandidate, session?: ClientSession): Promise<'standard' | 'practice'> {
  const stored = await db.collection<{ _id: string; roomId: string; mode?: 'standard' | 'practice'; participants: SessionParticipant[] }>('gameSessions')
    .findOne({ _id: candidate.sessionId, roomId: candidate.roomId }, { session });
  const mode = stored?.mode ?? 'standard';
  const roster = (players: SessionParticipant[]) => JSON.stringify(players.map((player) => ({
    accountId: player.accountId, displayName: player.displayName, seat: player.seat, kind: player.kind ?? 'human',
  })));
  if (!stored || mode !== (candidate.mode ?? 'standard') || roster(stored.participants) !== roster(candidate.participants) ||
      mode === 'standard' && candidate.participants.some((player) => player.kind === 'bot' || player.accountId.startsWith('bot:'))) {
    throw new SettlementError('INVALID_SETTLEMENT', 'Settlement mode or roster differs from the durable session.');
  }
  return mode;
}
