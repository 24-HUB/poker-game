import { randomUUID } from 'node:crypto';

import type { GameCommand } from '@poker/contracts' with { 'resolution-mode': 'import' };

import { AuthorityLease } from '../src/authority/authorityLease';
import { applyMigrations } from '../src/database/migrate';
import { TransactionRunner } from '../src/database/transactionRunner';
import { RoomCommandCache } from '../src/modules/rooms/roomCommandCache';
import { RoomRepository } from '../src/modules/rooms/room.repository';
import { RoomRegistry } from '../src/modules/rooms/roomRegistry';
import { RoomService, type RoomContext } from '../src/modules/rooms/room.service';
import { SessionRepository } from '../src/modules/rooms/session.repository';
import { SessionService } from '../src/modules/rooms/session.service';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

describe('durable poker sessions', () => {
  let database: TestDatabase;
  let authority: AuthorityLease;
  let registry: RoomRegistry;
  let rooms: RoomService;
  let sessions: SessionService;
  let bootId: string;

  const context = (accountId: string, connectionId = `${accountId}-tab`): RoomContext => ({
    identity: { accountId, displayName: accountId, sessionId: `${accountId}-session`, expiresAt: new Date(Date.now() + 60_000) },
    connectionId,
  });
  const metadata = () => ({ commandId: randomUUID(), authorityBootId: bootId, issuedAt: new Date().toISOString() });
  const create = async (host = context('host')) => {
    const reply = await rooms.execute(host, { type: 'room:create', title: 'Poker', ...metadata() });
    if (reply.error || !reply.data.room || !reply.data.invitation) throw new Error('Expected room');
    return { roomId: reply.data.room.roomId, token: reply.data.invitation.token };
  };
  const join = async (token: string, accountId: string) => rooms.execute(context(accountId), {
    type: 'room:join', token, ...metadata(),
  });
  const startCommand = (roomId: string, controlEpoch = 1): Extract<GameCommand, { type: 'session:start' }> => ({
    type: 'session:start', roomId, controlEpoch, ...metadata(),
  });

  beforeEach(async () => {
    database = await createTestDatabase();
    await applyMigrations(database.db);
    authority = new AuthorityLease(database.db, 'session-test-boot');
    const token = await authority.acquire();
    if (!token) throw new Error('Expected authority');
    authority.markReady(token);
    bootId = token.bootId;
    registry = new RoomRegistry();
    rooms = new RoomService(new RoomRepository(database.db, new TransactionRunner(database.client), authority),
      registry, new RoomCommandCache(), authority);
    sessions = new SessionService(new SessionRepository(database.db, new TransactionRunner(database.client), authority),
      registry, authority);
  });

  afterEach(async () => {
    rooms.dispose();
    await database.dispose();
  });

  it('duplicateStartCreatesOneSession', async () => {
    const { roomId, token } = await create();
    await join(token, 'guest');
    const command = startCommand(roomId);
    const first = await registry.enqueue(roomId, () => sessions.startInQueue(context('host'), command));
    const retry = await registry.enqueue(roomId, () => sessions.startInQueue(context('host'), command));
    expect(retry.sessionId).toBe(first.sessionId);
    expect(retry.firstHandId).toBe(first.firstHandId);
    expect(await database.db.collection('gameSessions').countDocuments()).toBe(1);
    expect(await database.db.collection('hands').countDocuments()).toBe(1);
    expect(await database.db.collection('activeParticipants').countDocuments()).toBe(2);
    expect((await rooms.execute(context('host'), { type: 'room:sync', roomId })).data?.room)
      .toMatchObject({ phase: 'playing', sessionId: first.sessionId });
  });

  it('nonHostCannotStart', async () => {
    const { roomId, token } = await create();
    await join(token, 'guest');
    await expect(registry.enqueue(roomId, () => sessions.startInQueue(context('guest'), startCommand(roomId))))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(await database.db.collection('gameSessions').countDocuments()).toBe(0);
  });

  it('startRequiresTwoToSixSeats', async () => {
    const { roomId } = await create();
    await expect(registry.enqueue(roomId, () => sessions.startInQueue(context('host'), startCommand(roomId))))
      .rejects.toMatchObject({ code: 'NOT_ENOUGH_PLAYERS' });
    expect(await database.db.collection('gameSessions').countDocuments()).toBe(0);
  });

  it('joinAndStartRaceLocksOneRoster', async () => {
    const { roomId, token } = await create();
    await join(token, 'guest');
    const [started, late] = await Promise.all([
      registry.enqueue(roomId, () => sessions.startInQueue(context('host'), startCommand(roomId))),
      join(token, 'late'),
    ]);
    if (late.error) expect(late.error.code).toBe('SESSION_IN_PROGRESS');
    expect(started.participants.map((participant) => participant.accountId))
      .toEqual(late.error ? ['host', 'guest'] : ['host', 'guest', 'late']);
    expect(await database.db.collection('activeParticipants').countDocuments()).toBe(started.participants.length);
  });

  it('activeParticipantCannotStartElsewhere', async () => {
    const first = await create();
    await join(first.token, 'guest');
    await registry.enqueue(first.roomId, () => sessions.startInQueue(context('host'), startCommand(first.roomId)));
    const second = await create(context('other-host'));
    await join(second.token, 'other-guest');
    await database.db.collection<{ _id: string; roomId: string; accountId: string; displayName: string;
      seat: number; controllerConnectionId: string; controllerEpoch: number; joinedAt: Date; leftAt: Date | null }>('roomMemberships').insertOne({
      _id: `${second.roomId}:guest`, roomId: second.roomId, accountId: 'guest', displayName: 'guest',
      seat: 2, controllerConnectionId: 'guest-tab', controllerEpoch: 1, joinedAt: new Date(), leftAt: null,
    });
    await expect(registry.enqueue(second.roomId, () => sessions.startInQueue(context('other-host'), startCommand(second.roomId))))
      .rejects.toMatchObject({ code: 'ALREADY_IN_SESSION' });
    expect(await database.db.collection('gameSessions').countDocuments()).toBe(1);
  });

  it('locks seat moves while leaving an active participant seated until session end', async () => {
    const { roomId, token } = await create();
    await join(token, 'guest');
    const started = await registry.enqueue(roomId, () => sessions.startInQueue(context('host'), startCommand(roomId)));
    const moved = await rooms.execute(context('guest'), {
      type: 'room:takeSeat', roomId, seat: 2, controlEpoch: 1, ...metadata(),
    });
    expect(moved.error?.code).toBe('SESSION_IN_PROGRESS');
    const left = await rooms.execute(context('guest'), {
      type: 'room:leave', roomId, controlEpoch: 1, ...metadata(),
    });
    expect(left.error).toBeNull();
    expect(await database.db.collection('activeParticipants').countDocuments({ sessionId: started.sessionId })).toBe(2);
    expect(await database.db.collection('roomMemberships').findOne({ roomId, accountId: 'guest' }))
      .toMatchObject({ seat: 1, leftAt: null, pendingDeparture: true });
    const returned = await rooms.execute(context('guest', 'guest-return-tab'), { type: 'room:sync', roomId });
    expect(returned.error).toBeNull();
    expect((await database.db.collection('roomMemberships').findOne({ roomId, accountId: 'guest' }))?.pendingDeparture)
      .toBe(false);
  });

  it('host end request is durable and leaves the current hand untouched', async () => {
    const { roomId, token } = await create();
    await join(token, 'guest');
    const started = await registry.enqueue(roomId, () => sessions.startInQueue(context('host'), startCommand(roomId)));
    const command: Extract<GameCommand, { type: 'session:end' }> = {
      type: 'session:end', roomId, sessionId: started.sessionId, controlEpoch: 1, ...metadata(),
    };
    await expect(registry.enqueue(roomId, () => sessions.requestEndInQueue(context('guest'), command)))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    await registry.enqueue(roomId, () => sessions.requestEndInQueue(context('host'), command));
    const afterFirst = (await database.db.collection<{ _id: string; revision: number }>('rooms')
      .findOne({ _id: roomId }))!.revision;
    await registry.enqueue(roomId, () => sessions.requestEndInQueue(context('host'), command));
    expect((await database.db.collection<{ _id: string; revision: number }>('rooms')
      .findOne({ _id: roomId }))!.revision).toBe(afterFirst);
    expect((await database.db.collection<{ _id: string; endingRequested: boolean }>('gameSessions')
      .findOne({ _id: started.sessionId }))?.endingRequested).toBe(true);
    expect((await database.db.collection<{ _id: string; status: string }>('hands')
      .findOne({ _id: started.firstHandId }))?.status).toBe('PENDING');
  });

  it('migration 003 is idempotent and a failed start rolls back participation', async () => {
    await applyMigrations(database.db);
    const { roomId, token } = await create();
    await join(token, 'guest');
    await database.db.collection<{ _id: string; accountId: string; roomId: string; sessionId: string; joinedAt: Date }>('activeParticipants')
      .insertOne({ _id: 'guest', accountId: 'guest', roomId: 'other', sessionId: 'other', joinedAt: new Date() });
    await expect(registry.enqueue(roomId, () => sessions.startInQueue(context('host'), startCommand(roomId))))
      .rejects.toMatchObject({ code: 'ALREADY_IN_SESSION' });
    expect(await database.db.collection('gameSessions').countDocuments()).toBe(0);
    expect(await database.db.collection('hands').countDocuments()).toBe(0);
    expect(await database.db.collection('activeParticipants').countDocuments()).toBe(1);
    expect((await database.db.collection<{ _id: string; phase: string }>('rooms').findOne({ _id: roomId }))?.phase)
      .toBe('waiting');
  });
});
