import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountChanges {
  private readonly listeners = new Set<(accountId: string, revision: number) => Promise<void>>();
  public subscribe(listener: (accountId: string, revision: number) => Promise<void>): void { this.listeners.add(listener); }
  public publish(accountId: string, revision: number): void {
    for (const listener of this.listeners) void listener(accountId, revision).catch(() => undefined);
  }
}
