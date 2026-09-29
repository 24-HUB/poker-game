import { gameCommandSchema, roomCommandSchema, type GameMutationCommand, type RoomMutationCommand } from '@poker/contracts';

const pendingCommandKey = 'poker.pending-room-command';
const pendingGameCommandKey = 'poker.pending-game-command';

export function storePendingGameCommand(accountId: string, command: GameMutationCommand, storage: Storage): void {
  storage.setItem(pendingGameCommandKey, JSON.stringify({ accountId, command }));
}

export function readPendingGameCommand(accountId: string, roomId: string, storage: Storage): GameMutationCommand | null {
  const value = storage.getItem(pendingGameCommandKey);
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return clearInvalidGame(storage);
    const candidate = parsed as Record<string, unknown>;
    const command = gameCommandSchema.safeParse(candidate.command);
    if (candidate.accountId !== accountId || !command.success || command.data.type === 'game:sync' ||
      command.data.roomId !== roomId) return clearInvalidGame(storage);
    return command.data;
  } catch { return clearInvalidGame(storage); }
}

export function clearPendingGameCommand(storage: Storage): void { storage.removeItem(pendingGameCommandKey); }

function clearInvalidGame(storage: Storage): null { clearPendingGameCommand(storage); return null; }

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
