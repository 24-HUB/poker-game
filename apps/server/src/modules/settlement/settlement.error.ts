export class SettlementError extends Error {
  public constructor(public readonly code: string, message: string) { super(message); }
}
