import { describe, expect, it } from 'vitest';
import { roomCommandSchema, roomViewSchema } from './rooms.js';
import { sessionResultSchema } from './poker.js';

const metadata = { roomId: 'room', commandId: '11111111-1111-4111-8111-111111111111',
  authorityBootId: 'boot', issuedAt: '2026-10-15T00:00:00.000Z', controlEpoch: 1 };
const botId = 'bot:22222222-2222-4222-8222-222222222222';

describe('bot contracts', () => {
  it('accepts bounded host bot commands and rejects forged fields', () => {
    expect(roomCommandSchema.safeParse({ type: 'room:addBot', ...metadata, seat: 5 }).success).toBe(true);
    expect(roomCommandSchema.safeParse({ type: 'room:removeBot', ...metadata, botId }).success).toBe(true);
    for (const seat of [-1, 6, 1.5]) expect(roomCommandSchema.safeParse({ type: 'room:addBot', ...metadata, seat }).success).toBe(false);
    expect(roomCommandSchema.safeParse({ type: 'room:removeBot', ...metadata, botId: 'human' }).success).toBe(false);
    expect(roomCommandSchema.safeParse({ type: 'room:addBot', ...metadata, seat: 1, accountId: 'forged' }).success).toBe(false);
  });
  it('keeps bot identity separate from human memberships', () => {
    const room = { roomId: 'room', title: 'Room', revision: 1, hostAccountId: 'human', phase: 'waiting', sessionId: null,
      members: [{ accountId: 'human', displayName: 'Human', seat: 0, connected: true }],
      bots: [{ botId, displayName: 'Bot 1', seat: 1 }], control: { isController: true, epoch: 1 } };
    expect(roomViewSchema.safeParse(room).success).toBe(true);
    expect(roomViewSchema.safeParse({ ...room, bots: [{ ...room.bots[0], connected: true }] }).success).toBe(false);
  });
  it('parses practice session standings and all-human bust ending', () => {
    const result = { sessionId: 's', roomId: 'r', mode: 'practice', endedAt: metadata.issuedAt,
      reason: 'NO_FUNDED_HUMANS', standings: [{ accountId: 'human', kind: 'human', seat: 0, stack: 0 },
        { accountId: botId, kind: 'bot', seat: 1, stack: 2000 }], leaderAccountIds: [botId] };
    expect(sessionResultSchema.safeParse(result).success).toBe(true);
    expect(sessionResultSchema.safeParse({ ...result, mode: 'paid' }).success).toBe(false);
  });
});
