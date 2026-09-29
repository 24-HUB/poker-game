import { z } from 'zod';

import type { Result } from './common.js';

const id = z.string().min(1).max(128);
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
  accountId: id, displayName: z.string().min(1).max(128),
  seat: z.number().int().min(0).max(5), stack: chips,
  streetContribution: chips, totalContribution: chips,
  folded: z.boolean(), allIn: z.boolean(), connected: z.boolean(),
}).strict();

const potSchema = z.object({ amount: chips, eligibleAccountIds: z.array(id).max(6) }).strict();
const payoutSchema = z.object({ accountId: id, amount: chips }).strict();
export const committedHandResultSchema = z.object({
  handId: id, sessionId: id, handNumber: chips.positive(),
  completedAt: z.iso.datetime(), completedDateUtc: z.iso.date(), rulesVersion: chips.positive(),
  contributions: z.array(payoutSchema).min(2).max(6),
  payouts: z.array(payoutSchema).min(2).max(6),
  finalStacks: z.array(payoutSchema).min(2).max(6),
  manualActionAccountIds: z.array(id).max(6),
  winners: z.array(id).min(1).max(6),
  revealedCards: z.array(z.object({ accountId: id, cards: z.tuple([card, card]) }).strict()).max(6),
}).strict();
export type CommittedHandResult = z.infer<typeof committedHandResultSchema>;

export const sessionResultSchema = z.object({
  sessionId: id, roomId: id, endedAt: z.iso.datetime(),
  reason: z.enum(['HOST_ENDED', 'ONE_FUNDED', 'ABANDONED', 'RESTARTED']),
  standings: z.array(z.object({ accountId: id, seat: z.number().int().min(0).max(5), stack: chips }).strict()).min(2).max(6),
  leaderAccountIds: z.array(id).max(6),
}).strict();
export type SessionResult = z.infer<typeof sessionResultSchema>;

export const legalActionsSchema = z.object({
  canFold: z.boolean(), canCheck: z.boolean(), callAmount: chips,
  raise: z.object({ minRaiseTo: chips.positive(), maxRaiseTo: chips.positive(), shortAllInOnly: z.boolean() }).strict().nullable(),
}).strict();
export type LegalActionsView = z.infer<typeof legalActionsSchema>;

export const gameViewSchema = z.object({
  roomId: id, authorityBootId: id, sessionId: id, handId: id.nullable(),
  snapshotRevision: chips, gameVersion: chips,
  sessionPhase: z.enum(['playing', 'ending', 'ended', 'aborted']),
  handPhase: z.enum(['preflop', 'flop', 'turn', 'river', 'settling', 'paused', 'result']).nullable(),
  participants: z.array(participantSchema).min(2).max(6),
  board: z.array(card).max(5), pots: z.array(potSchema),
  buttonSeat: z.number().int().min(0).max(5),
  actorAccountId: id.nullable(), serverTime: z.iso.datetime(), deadline: z.iso.datetime().nullable(),
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
