import { z } from 'zod';

import type { Result } from './common.js';
import { rewardReceiptSchema } from './tickets.js';
import { handEquipmentSchema } from './collection.js';

const id = z.string().min(1).max(128);
export const participantKindSchema = z.enum(['human', 'bot']);
export const sessionModeSchema = z.enum(['standard', 'practice']);
export type ParticipantKind = z.infer<typeof participantKindSchema>;
export type SessionMode = z.infer<typeof sessionModeSchema>;
const chips = z.number().int().nonnegative().safe();
const card = z.number().int().min(0).max(51);
const mutation = {
  commandId: z.uuid(),
  authorityBootId: id,
  issuedAt: z.iso.datetime(),
  roomId: id,
  controlEpoch: chips,
};

export const pokerActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('fold') }).strict(),
  z.object({ type: z.literal('check') }).strict(),
  z.object({ type: z.literal('call') }).strict(),
  z.object({ type: z.literal('raise'), raiseTo: chips.positive() }).strict(),
]);
export type PokerAction = z.infer<typeof pokerActionSchema>;

export const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('session:start'), ...mutation }).strict(),
  z.object({ type: z.literal('session:end'), ...mutation, sessionId: id }).strict(),
  z.object({
    type: z.literal('game:action'), ...mutation, sessionId: id, handId: id,
    expectedGameVersion: chips, action: pokerActionSchema,
  }).strict(),
  z.object({ type: z.literal('game:sync'), roomId: id }).strict(),
]);
export type GameCommand = z.infer<typeof gameCommandSchema>;
export type GameMutationCommand = Exclude<GameCommand, { type: 'game:sync' }>;

export const POKER_ERROR_CODES = [
  'ILLEGAL_ACTION', 'NOT_YOUR_TURN', 'STALE_STATE', 'SESSION_IN_PROGRESS',
  'SESSION_NOT_ACTIVE', 'HAND_SETTLING',
] as const;
export type PokerErrorCode = (typeof POKER_ERROR_CODES)[number];

const participantSchema = z.object({
  kind: participantKindSchema.optional(),
  accountId: id, displayName: z.string().min(1).max(128),
  seat: z.number().int().min(0).max(5), stack: chips,
  streetContribution: chips, totalContribution: chips,
  folded: z.boolean(), allIn: z.boolean(), connected: z.boolean(),
  equipment: handEquipmentSchema.optional(),
}).strict();

const potSchema = z.object({ amount: chips, eligibleAccountIds: z.array(id).max(6) }).strict();
const payoutSchema = z.object({ accountId: id, amount: chips }).strict();
export const handResultPresentationSchema = z.object({
  version: z.literal(1), outcomeReason: z.enum(['showdown', 'fold']), board: z.array(card).max(5),
  participants: z.array(z.object({ accountId: id, displayName: z.string().min(1).max(128),
    kind: participantKindSchema.optional(), seat: z.number().int().min(0).max(5), folded: z.boolean(), equipment: handEquipmentSchema.optional() }).strict()).min(2).max(6),
  rankings: z.array(z.object({ accountId: id,
    rank: z.object({ category: z.number().int().min(0).max(8), tiebreak: z.array(z.number().int().min(2).max(14)).min(1).max(5) }).strict(),
    handName: z.string().min(1).max(100), bestFive: z.array(card).length(5),
    combinationCards: z.array(card).min(1).max(5), kickers: z.array(z.number().int().min(2).max(14)).max(3), playsBoard: z.boolean(),
  }).strict()).max(6),
  pots: z.array(z.object({ ...potSchema.shape, winners: z.array(id).min(1).max(6), payouts: z.array(payoutSchema).min(1).max(6) }).strict()).max(6),
  uncalledReturns: z.array(payoutSchema).max(1),
}).strict();
export type HandResultPresentation = z.infer<typeof handResultPresentationSchema>;
export const committedHandResultSchema = z.object({
  mode: sessionModeSchema.optional(),
  handId: id, sessionId: id, handNumber: chips.positive(),
  completedAt: z.iso.datetime(), completedDateUtc: z.iso.date(), rulesVersion: chips.positive(),
  contributions: z.array(payoutSchema).min(2).max(6),
  payouts: z.array(payoutSchema).min(2).max(6),
  finalStacks: z.array(payoutSchema).min(2).max(6),
  manualActionAccountIds: z.array(id).max(6),
  winners: z.array(id).min(1).max(6),
  revealedCards: z.array(z.object({ accountId: id, cards: z.tuple([card, card]) }).strict()).max(6),
  rewardReceipts: z.array(rewardReceiptSchema).max(6).optional(),
  presentation: handResultPresentationSchema.optional(),
}).strict().superRefine((result, context) => {
  const detail = result.presentation;
  if (!detail) return;
  const invalid = () => context.addIssue({ code: 'custom', message: 'Public presentation must reconcile with the committed result.', path: ['presentation'] });
  if (new Set(detail.board).size !== detail.board.length ||
      detail.outcomeReason === 'fold' && (detail.rankings.length !== 0 || result.revealedCards.length !== 0) ||
      detail.outcomeReason === 'showdown' && (detail.board.length !== 5 || detail.rankings.length !== result.revealedCards.length)) invalid();
  for (const ranking of detail.rankings) {
    const reveal = result.revealedCards.find((entry) => entry.accountId === ranking.accountId);
    if (!reveal || detail.participants.find((player) => player.accountId === ranking.accountId)?.folded ||
        new Set(ranking.bestFive).size !== 5 || ranking.bestFive.some((card) => ![...detail.board, ...reveal.cards].includes(card)) ||
        ranking.combinationCards.some((card) => !ranking.bestFive.includes(card))) invalid();
  }
  const ids = result.payouts.map((entry) => entry.accountId);
  if (detail.participants.length !== ids.length || new Set(detail.participants.map((player) => player.accountId)).size !== ids.length ||
      detail.participants.some((player) => !ids.includes(player.accountId))) invalid();
  for (const payout of result.payouts) {
    const award = detail.pots.flatMap((pot) => pot.payouts).filter((entry) => entry.accountId === payout.accountId).reduce((sum, entry) => sum + entry.amount, 0);
    const returned = detail.uncalledReturns.filter((entry) => entry.accountId === payout.accountId).reduce((sum, entry) => sum + entry.amount, 0);
    if (award + returned !== payout.amount) invalid();
  }
  if (detail.pots.some((pot) => pot.amount !== pot.payouts.reduce((sum, entry) => sum + entry.amount, 0) ||
      pot.payouts.some((entry) => !ids.includes(entry.accountId) || !pot.winners.includes(entry.accountId)))) invalid();
});
export type CommittedHandResult = z.infer<typeof committedHandResultSchema>;

export const handHistorySchema = z.object({
  hands: z.array(committedHandResultSchema).max(20),
  nextBeforeHandNumber: chips.positive().nullable(),
}).strict();
export type HandHistoryPage = z.infer<typeof handHistorySchema>;

export const sessionResultSchema = z.object({
  mode: sessionModeSchema.optional(),
  sessionId: id, roomId: id, endedAt: z.iso.datetime(),
  reason: z.enum(['HOST_ENDED', 'ONE_FUNDED', 'NO_FUNDED_HUMANS', 'ABANDONED', 'RESTARTED']),
  standings: z.array(z.object({ accountId: id, kind: participantKindSchema.optional(), seat: z.number().int().min(0).max(5), stack: chips }).strict()).min(2).max(6),
  leaderAccountIds: z.array(id).max(6),
}).strict();
export type SessionResult = z.infer<typeof sessionResultSchema>;

export const legalActionsSchema = z.object({
  canFold: z.boolean(), canCheck: z.boolean(), callAmount: chips,
  raise: z.object({ minRaiseTo: chips.positive(), maxRaiseTo: chips.positive(), amountStep: chips.positive(), shortAllInOnly: z.boolean() }).strict().nullable(),
}).strict();
export type LegalActionsView = z.infer<typeof legalActionsSchema>;

export const gameViewSchema = z.object({
  mode: sessionModeSchema.optional(), presencePaused: z.boolean().optional(),
  roomId: id, authorityBootId: id, sessionId: id, handId: id.nullable(),
  snapshotRevision: chips, gameVersion: chips,
  handNumber: chips.positive(), smallBlind: chips.positive(), bigBlind: chips.positive(), currentBet: chips,
  smallBlindSeat: z.number().int().min(0).max(5).nullable(), bigBlindSeat: z.number().int().min(0).max(5).nullable(),
  sessionPhase: z.enum(['playing', 'ending', 'ended', 'aborted']),
  handPhase: z.enum(['preflop', 'flop', 'turn', 'river', 'settling', 'paused', 'result']).nullable(),
  participants: z.array(participantSchema).min(2).max(6),
  board: z.array(card).max(5), pots: z.array(potSchema),
  buttonSeat: z.number().int().min(0).max(5),
  actorAccountId: id.nullable(), serverTime: z.iso.datetime(), deadline: z.iso.datetime().nullable(),
  nextTransitionAt: z.iso.datetime().nullable().optional(), nextTransition: z.enum(['next-hand', 'session-end']).nullable().optional(),
  holeCards: z.tuple([card, card]).nullable(),
  revealedCards: z.array(z.object({ accountId: id, cards: z.tuple([card, card]) }).strict()).max(6),
  legalActions: legalActionsSchema,
  control: z.object({ isController: z.boolean(), epoch: chips }).strict(),
  handResult: committedHandResultSchema.nullable(), sessionResult: sessionResultSchema.nullable(),
}).strict();
export type GameView = z.infer<typeof gameViewSchema>;

export const commandOutcomeSchema = z.object({
  commandId: z.uuid(), sessionId: id, handId: id.nullable(), acceptedGameVersion: chips.nullable(),
}).strict();
export type CommandOutcome = z.infer<typeof commandOutcomeSchema>;
export const gameReplySchema = z.object({ game: gameViewSchema.nullable(), outcome: commandOutcomeSchema.nullable() }).strict();
export type GameReply = z.infer<typeof gameReplySchema>;
export type GameAck = (result: Result<GameReply>) => void;
