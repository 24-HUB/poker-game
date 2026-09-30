import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { CommittedHandResult } from '@poker/contracts' with { 'resolution-mode': 'import' };
import type { EngineSettlement } from '@poker/poker-engine' with { 'resolution-mode': 'import' };

import type { AuthorityToken } from '../../authority/authorityLease';
import type { SessionParticipant } from '../rooms/session.repository';
import { SettlementRepository } from './settlement.repository';
import { SettlementError } from './settlement.error';
export { SettlementError } from './settlement.error';

export type SettlementCandidate = {
  roomId: string;
  sessionId: string;
  handId: string;
  handNumber: number;
  authority: AuthorityToken;
  expectedRevision: number;
  rulesVersion: number;
  completedAt: Date;
  completedDateUtc: string;
  participants: SessionParticipant[];
  engine: EngineSettlement;
};

function candidateHash(candidate: SettlementCandidate): string {
  return createHash('sha256').update(JSON.stringify(candidate)).digest('hex');
}

function toResult(candidate: SettlementCandidate): CommittedHandResult {
  const ids = candidate.participants.map((participant) => participant.accountId);
  const payouts = ids.map((accountId) => ({ accountId, amount: candidate.engine.payouts[accountId] ?? 0 }));
  const contributions = ids.map((accountId) => ({ accountId, amount: candidate.engine.contributions[accountId] ?? 0 }));
  const finalStacks = ids.map((accountId, index) => ({ accountId, amount: candidate.engine.finalStacks[index]! }));
  const total = (entries: typeof payouts) => entries.reduce((sum, entry) => sum + entry.amount, 0);
  if (candidate.participants.length < 2 || candidate.participants.length > 6 ||
      candidate.engine.finalStacks.length !== ids.length ||
      [...contributions, ...payouts, ...finalStacks].some(({ amount }) => !Number.isSafeInteger(amount) || amount < 0) ||
      total(contributions) !== total(payouts) ||
      candidate.completedDateUtc !== candidate.completedAt.toISOString().slice(0, 10)) {
    throw new SettlementError('INVALID_SETTLEMENT', 'The settlement does not conserve valid chips.');
  }
  const winners = [...new Set(candidate.engine.pots.flatMap((pot) => pot.winners))];
  if (!winners.length || winners.some((id) => !ids.includes(id))) {
    throw new SettlementError('INVALID_SETTLEMENT', 'The settlement has no valid winner.');
  }
  return {
    handId: candidate.handId, sessionId: candidate.sessionId, handNumber: candidate.handNumber,
    completedAt: candidate.completedAt.toISOString(), completedDateUtc: candidate.completedDateUtc,
    rulesVersion: candidate.rulesVersion, contributions, payouts, finalStacks,
    manualActionAccountIds: candidate.engine.manualActionAccountIds,
    winners,
    revealedCards: candidate.engine.revealedCards.map(({ accountId, cards }) => ({
      accountId, cards: [...cards] as [number, number],
    })),
  };
}

@Injectable()
export class SettlementService {
  public constructor(private readonly repository: SettlementRepository) {}

  public async commit(candidate: SettlementCandidate): Promise<CommittedHandResult> {
    const hash = candidateHash(candidate);
    const result = toResult(candidate);
    try {
      return await this.repository.commit(candidate, hash, result);
    } catch (error) {
      const receipt = await this.repository.findCommitted(candidate.handId);
      if (receipt) {
        if (receipt.candidateHash !== hash) throw new SettlementError('SETTLEMENT_CONFLICT', 'The hand has a different committed result.');
        return receipt.result;
      }
      throw error;
    }
  }

  public async findCommitted(handId: string): Promise<CommittedHandResult | null> {
    return (await this.repository.findCommitted(handId))?.result ?? null;
  }
}
