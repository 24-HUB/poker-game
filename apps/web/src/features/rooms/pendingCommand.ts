import { roomCommandSchema, type RoomMutationCommand } from '@poker/contracts';

const pendingCommandKey = 'poker.pending-room-command';

export function storePendingCommand(
  accountId: string,
  command: RoomMutationCommand,
  storage: Storage,
): void {
  storage.setItem(pendingCommandKey, JSON.stringify({ accountId, command }));
}

export function readPendingCommand(accountId: string, storage: Storage): RoomMutationCommand | null {
  const value = storage.getItem(pendingCommandKey);
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return clearInvalid(storage);
    const candidate = parsed as Record<string, unknown>;
    const command = roomCommandSchema.safeParse(candidate.command);
    if (candidate.accountId !== accountId || !command.success || command.data.type === 'room:sync') {
      return clearInvalid(storage);
    }
    return command.data;
  } catch {
    return clearInvalid(storage);
  }
}

export function clearPendingCommand(storage: Storage): void {
  storage.removeItem(pendingCommandKey);
}

function clearInvalid(storage: Storage): null {
  clearPendingCommand(storage);
  return null;
}
