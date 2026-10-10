import type { GameView } from '@poker/contracts' with { 'resolution-mode': 'import' };
import { legalActions } from '@poker/poker-engine';

import type { InternalRoom } from '../modules/rooms/roomController';
import type { SessionRuntime } from '../modules/rooms/session.service';
import type { RoomController } from '../modules/rooms/roomController';

function currentPots(runtime: SessionRuntime): GameView['pots'] {
  if (runtime.settlement && runtime.committedHandResult?.handId === runtime.handId &&
    (runtime.hand?.street === 'complete' || runtime.sessionResult)) {
    return runtime.settlement.pots.map((pot) => ({
      amount: pot.amount, eligibleAccountIds: [...pot.eligibleAccountIds],
    }));
  }
  const seats = runtime.hand?.seats ?? [];
  const levels = [...new Set(seats.map((seat) => seat.totalContribution))]
    .filter((level) => level > 0).sort((a, b) => a - b);
  let previous = 0;
  return levels.map((level) => {
    const contributors = seats.filter((seat) => seat.totalContribution >= level);
    const amount = (level - previous) * contributors.length;
    previous = level;
    return { amount, eligibleAccountIds: contributors.filter((seat) => !seat.folded).map((seat) => seat.accountId) };
  });
}

export function projectGame(runtime: SessionRuntime, room: InternalRoom, controller: RoomController,
  accountId: string, connectionId: string, now: number): GameView {
  const hand = runtime.hand;
  const control = controller.controller(accountId);
  const member = room.members.find((candidate) => candidate.accountId === accountId);
  const isController = control?.connectionId === connectionId;
  const legal = hand && isController ? legalActions(hand, accountId)
    : { canFold: false, canCheck: false, callAmount: 0, raise: null };
  return {
    roomId: runtime.roomId, authorityBootId: room.authorityBootId,
    sessionId: runtime.sessionId, handId: hand ? runtime.handId : null,
    snapshotRevision: runtime.snapshotRevision, gameVersion: runtime.gameVersion,
    sessionPhase: runtime.sessionResult ? 'ended' : runtime.ending ? 'ending' : 'playing',
    handPhase: hand?.street === 'complete' ? runtime.paused ? 'paused' : runtime.committedHandResult?.handId === runtime.handId ? 'result' : 'settling' : hand?.street ?? null,
    participants: runtime.participants.map((participant, index) => {
      const seat = hand?.seats.find((candidate) => candidate.accountId === participant.accountId);
      return {
        ...participant, stack: hand?.street === 'complete' && runtime.committedHandResult?.handId === runtime.handId
          ? runtime.stacks[index]! : seat?.stack ?? runtime.stacks[index]!,
        streetContribution: seat?.streetContribution ?? 0, totalContribution: seat?.totalContribution ?? 0,
        folded: seat?.folded ?? false, allIn: seat?.allIn ?? false,
        connected: controller.isConnected(participant.accountId),
        equipment: runtime.equipmentByAccount?.[participant.accountId] ?? { avatar: null, cardBack: null },
      };
    }),
    board: [...(hand?.board ?? [])], pots: currentPots(runtime), buttonSeat: runtime.buttonSeat,
    actorAccountId: hand?.actorAccountId ?? null, serverTime: new Date(now).toISOString(),
    deadline: runtime.deadline === null ? null : new Date(runtime.deadline).toISOString(),
    holeCards: hand?.seats.find((seat) => seat.accountId === accountId)?.holeCards
      ? [...hand.seats.find((seat) => seat.accountId === accountId)!.holeCards] as [number, number]
      : null,
    revealedCards: runtime.committedHandResult?.handId === runtime.handId ? runtime.committedHandResult.revealedCards : [], legalActions: legal,
    control: { isController, epoch: control?.epoch ?? member?.controllerEpoch ?? 0 },
    handResult: runtime.committedHandResult ? {
      ...runtime.committedHandResult,
      rewardReceipts: runtime.committedHandResult.rewardReceipts?.filter((receipt) => receipt.accountId === accountId),
    } : null,
    sessionResult: runtime.sessionResult,
  };
}
