import type { RoomView } from '@poker/contracts' with { 'resolution-mode': 'import' };

import type { InternalRoom } from '../modules/rooms/roomController';

export function projectRoom(
  room: InternalRoom,
  accountId: string,
  connectionId: string,
): RoomView {
  const membership = room.members.find((member) => member.accountId === accountId);
  return {
    roomId: room.roomId,
    title: room.title,
    revision: room.revision,
    hostAccountId: room.hostAccountId,
    phase: room.phase,
    sessionId: room.sessionId,
    members: room.members
      .map(({ accountId: memberAccountId, displayName, seat, connected }) => ({
        accountId: memberAccountId,
        displayName,
        seat,
        connected,
      }))
      .sort((left, right) => (left.seat ?? 99) - (right.seat ?? 99)),
    control: {
      isController: membership?.controllerConnectionId === connectionId,
      epoch: membership?.controllerEpoch ?? 0,
    },
  };
}
