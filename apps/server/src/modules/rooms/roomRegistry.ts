import { RoomController } from './roomController';

export class RoomQueueFullError extends Error {
  public constructor() {
    super('Room command queue is full');
  }
}

class SerialQueue {
  private tail: Promise<void> = Promise.resolve();
  private depth = 0;

  public async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.depth >= 100) throw new RoomQueueFullError();
    this.depth += 1;
    const result = this.tail.then(work, work);
    this.tail = result.then(() => undefined, () => undefined);
    try {
      return await result;
    } finally {
      this.depth -= 1;
    }
  }
}

export class RoomRegistry {
  private readonly createQueue = new SerialQueue();
  private readonly queues = new Map<string, SerialQueue>();
  private readonly controllers = new Map<string, RoomController>();
  private readonly roomsByConnection = new Map<string, Set<string>>();

  public enqueueCreate<T>(work: () => Promise<T>): Promise<T> {
    return this.createQueue.run(work);
  }

  public enqueue<T>(roomId: string, work: () => Promise<T>): Promise<T> {
    const queue = this.queues.get(roomId) ?? new SerialQueue();
    this.queues.set(roomId, queue);
    return queue.run(work);
  }

  public controller(roomId: string): RoomController {
    const controller = this.controllers.get(roomId) ?? new RoomController();
    this.controllers.set(roomId, controller);
    return controller;
  }

  public connect(roomId: string, accountId: string, connectionId: string): boolean {
    const added = this.controller(roomId).connect(accountId, connectionId);
    const roomIds = this.roomsByConnection.get(connectionId) ?? new Set<string>();
    roomIds.add(roomId);
    this.roomsByConnection.set(connectionId, roomIds);
    return added;
  }

  public setController(roomId: string, accountId: string, connectionId: string, epoch: number): void {
    this.connect(roomId, accountId, connectionId);
    this.controller(roomId).setController(accountId, connectionId, epoch);
  }

  public roomsForConnection(connectionId: string): string[] {
    return [...(this.roomsByConnection.get(connectionId) ?? [])];
  }

  public disconnect(roomId: string, connectionId: string) {
    const result = this.controllers.get(roomId)?.disconnect(connectionId) ?? null;
    const roomIds = this.roomsByConnection.get(connectionId);
    roomIds?.delete(roomId);
    if (roomIds?.size === 0) this.roomsByConnection.delete(connectionId);
    return result;
  }

  public removeAccount(roomId: string, accountId: string): void {
    const connectionIds = this.controllers.get(roomId)?.removeAccount(accountId) ?? [];
    for (const connectionId of connectionIds) {
      const roomIds = this.roomsByConnection.get(connectionId);
      roomIds?.delete(roomId);
      if (roomIds?.size === 0) this.roomsByConnection.delete(connectionId);
    }
  }

  public remove(roomId: string): void {
    this.controllers.delete(roomId);
    this.queues.delete(roomId);
    for (const [connectionId, roomIds] of this.roomsByConnection) {
      roomIds.delete(roomId);
      if (roomIds.size === 0) this.roomsByConnection.delete(connectionId);
    }
  }
}
