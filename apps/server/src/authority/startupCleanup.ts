import type { ClientSession, Db } from 'mongodb';

import { AuthorityLease, type AuthorityToken } from './authorityLease';

export async function abortPreviousRooms(
  db: Db,
  lease: AuthorityLease,
  session: ClientSession,
  token: AuthorityToken,
): Promise<void> {
  await lease.fence(session, token);

  const staleSessions = await db.collection<{ _id: string; roomId: string }>('gameSessions').find(
    { status: 'ACTIVE', authorityBootId: { $ne: token.bootId } },
    { projection: { _id: 1, roomId: 1 }, session },
  ).toArray();
  const closedAt = new Date();
  if (staleSessions.length > 0) {
    const sessionIds = staleSessions.map((game) => game._id);
    await db.collection('hands').updateMany(
      { sessionId: { $in: sessionIds }, status: { $in: ['PENDING', 'SETTLING'] } },
      { $set: { status: 'ABORTED', abortedAt: closedAt } }, { session },
    );
    await db.collection<{ _id: string }>('gameSessions').updateMany(
      { _id: { $in: sessionIds }, status: 'ACTIVE' },
      { $set: { status: 'ABORTED', endedAt: closedAt, abortReason: 'RESTARTED' } }, { session },
    );
    await db.collection('activeParticipants').deleteMany({ sessionId: { $in: sessionIds } }, { session });
  }

  const staleRooms = await db.collection<{ _id: string }>('rooms').find(
    { status: 'OPEN', authorityBootId: { $ne: token.bootId } },
    { projection: { _id: 1 }, session },
  ).toArray();
  if (staleRooms.length === 0) return;

  const roomIds = staleRooms.map((room) => room._id);
  await db.collection<{ _id: string }>('rooms').updateMany(
    { _id: { $in: roomIds }, status: 'OPEN' },
    { $set: { status: 'CLOSED', closedAt, closedReason: 'RESTARTED' }, $inc: { revision: 1 } },
    { session },
  );
  await db.collection('roomMemberships').updateMany(
    {
      roomId: { $in: roomIds },
      $or: [{ leftAt: null }, { leftAt: { $exists: false } }],
    },
    { $set: { seat: null, leftAt: closedAt } },
    { session },
  );
  await db.collection('activeRoomMemberships').deleteMany(
    { roomId: { $in: roomIds } },
    { session },
  );
}
