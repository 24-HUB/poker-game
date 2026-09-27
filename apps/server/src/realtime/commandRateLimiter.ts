import { Injectable } from '@nestjs/common';
import type { RoomCommandType } from '@poker/contracts' with { 'resolution-mode': 'import' };

type Counter = { startedAt: number; count: number };

@Injectable()
export class CommandRateLimiter {
  private readonly socketsByAccount = new Map<string, Set<string>>();
  private readonly accountBySocket = new Map<string, string>();
  private readonly counters = new Map<string, Counter>();

  public registerSocket(accountId: string, socketId: string): boolean {
    const sockets = this.socketsByAccount.get(accountId) ?? new Set<string>();
    if (!sockets.has(socketId) && sockets.size >= 4) return false;
    sockets.add(socketId);
    this.socketsByAccount.set(accountId, sockets);
    this.accountBySocket.set(socketId, accountId);
    return true;
  }

  public unregisterSocket(socketId: string): void {
    const accountId = this.accountBySocket.get(socketId);
    if (!accountId) return;
    this.accountBySocket.delete(socketId);
    const sockets = this.socketsByAccount.get(accountId);
    sockets?.delete(socketId);
    if (sockets?.size === 0) this.socketsByAccount.delete(accountId);
  }

  public allow(accountId: string, type: RoomCommandType, now = Date.now()): boolean {
    if (type === 'room:sync') return this.consume(`${accountId}:sync`, 10, 10_000, now);
    if (!this.consume(`${accountId}:mutation`, 20, 10_000, now)) return false;
    if (type === 'room:create' || type === 'room:join') {
      return this.consume(`${accountId}:admission`, 5, 60_000, now);
    }
    return true;
  }

  private consume(key: string, limit: number, windowMs: number, now: number): boolean {
    const current = this.counters.get(key);
    if (!current || now - current.startedAt >= windowMs) {
      this.counters.set(key, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= limit;
  }
}
