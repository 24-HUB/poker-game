import type { ClientSession, Db } from 'mongodb';

import { AuthorityLease, type AuthorityToken } from './authorityLease';

export async function abortPreviousRooms(
  db: Db,
  lease: AuthorityLease,
  session: ClientSession,
  token: AuthorityToken,
): Promise<void> {
  await lease.fence(session, token);

  const staleRooms = await db.collection<{ _id: unknown }>('rooms').find(
    { status: 'OPEN', authorityBootId: { $ne: token.bootId } },
    { projection: { _id: 1 }, session },
  ).toArray();
  if (staleRooms.length === 0) return;

  const roomIds = staleRooms.map((room) => room._id);
  const closedAt = new Date();
  await db.collection('rooms').updateMany(
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
