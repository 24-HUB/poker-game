export type InternalRoomMember = {
  accountId: string;
  displayName: string;
  seat: number | null;
  controllerConnectionId: string | null;
  controllerEpoch: number;
  connected: boolean;
};

export type InternalRoom = {
  roomId: string;
  title: string;
  revision: number;
  hostAccountId: string;
  invitationHash: string;
  invitationExpiresAt: Date;
  authorityBootId: string;
  authorityEpoch: number;
  phase: 'waiting' | 'playing';
  sessionId: string | null;
  members: InternalRoomMember[];
};

export class RoomController {
  public session: import('./session.service').SessionRuntime | null = null;
  private readonly connectionsByAccount = new Map<string, Set<string>>();
  private readonly accountByConnection = new Map<string, string>();
  private readonly controllers = new Map<string, { connectionId: string; epoch: number }>();

  public connect(accountId: string, connectionId: string): boolean {
    const connections = this.connectionsByAccount.get(accountId) ?? new Set<string>();
    const added = !connections.has(connectionId);
    connections.add(connectionId);
    this.connectionsByAccount.set(accountId, connections);
    this.accountByConnection.set(connectionId, accountId);
    return added;
  }

  public setController(accountId: string, connectionId: string, epoch: number): void {
    this.connect(accountId, connectionId);
    this.controllers.set(accountId, { connectionId, epoch });
  }

  public controller(accountId: string): { connectionId: string; epoch: number } | null {
    return this.controllers.get(accountId) ?? null;
  }

  public isConnected(accountId: string): boolean {
    return (this.connectionsByAccount.get(accountId)?.size ?? 0) > 0;
  }

  public connectedAccountIds(): Set<string> {
    return new Set(
      [...this.connectionsByAccount.entries()]
        .filter(([, connections]) => connections.size > 0)
        .map(([accountId]) => accountId),
    );
  }

  public disconnect(connectionId: string): {
    accountId: string;
    controllerCleared: boolean;
    roomEmpty: boolean;
  } | null {
    const accountId = this.accountByConnection.get(connectionId);
    if (!accountId) return null;
    this.accountByConnection.delete(connectionId);
    const connections = this.connectionsByAccount.get(accountId);
    connections?.delete(connectionId);
    if (connections?.size === 0) this.connectionsByAccount.delete(accountId);

    const controllerCleared = this.controllers.get(accountId)?.connectionId === connectionId;
    if (controllerCleared) this.controllers.delete(accountId);
    return {
      accountId,
      controllerCleared,
      roomEmpty: this.accountByConnection.size === 0,
    };
  }

  public removeAccount(accountId: string): string[] {
    const connectionIds = [...(this.connectionsByAccount.get(accountId) ?? [])];
    for (const connectionId of connectionIds) this.accountByConnection.delete(connectionId);
    this.connectionsByAccount.delete(accountId);
    this.controllers.delete(accountId);
    return connectionIds;
  }

  public isEmpty(): boolean {
    return this.accountByConnection.size === 0;
  }
}
