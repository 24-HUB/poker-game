import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable, Optional, type OnApplicationShutdown } from '@nestjs/common';
import type { Result, RoomCommand, RoomReply } from '@poker/contracts' with { 'resolution-mode': 'import' };

import { AuthorityLease } from '../../authority/authorityLease';
import type { VerifiedAccountIdentity } from '../identity/identity.service';
import { projectRoom } from '../../projections/roomProjection';
import { RoomCommandCache } from './roomCommandCache';
import { RoomQueueFullError, RoomRegistry } from './roomRegistry';
import {
  newRoomId,
  RoomRepository,
  type StoredCommandOutcome,
} from './room.repository';

const DAY_MS = 24 * 60 * 60 * 1_000;
const FUTURE_SKEW_MS = 60 * 1_000;

export type RoomContext = {
  identity: VerifiedAccountIdentity;
  connectionId: string;
};

export const ROOM_SERVICE_OPTIONS = Symbol('ROOM_SERVICE_OPTIONS');
export type RoomServiceOptions = { emptyRetentionMs?: number };

@Injectable()
export class RoomService implements OnApplicationShutdown {
  private readonly emptyTimers = new Map<string, NodeJS.Timeout>();
  private readonly emptyRetentionMs: number;
  private disposed = false;

  public constructor(
    private readonly repository: RoomRepository,
    private readonly registry: RoomRegistry,
    private readonly commandCache: RoomCommandCache,
    private readonly authority: AuthorityLease,
    @Optional() @Inject(ROOM_SERVICE_OPTIONS) options: RoomServiceOptions = {},
  ) {
    this.emptyRetentionMs = options.emptyRetentionMs ?? 2 * 60 * 1_000;
  }

  public async execute(context: RoomContext, command: RoomCommand): Promise<Result<RoomReply>> {
    if (command.type === 'room:sync') return this.sync(context, command.roomId);

    const now = Date.now();
    const issuedAt = Date.parse(command.issuedAt);
    if (!Number.isFinite(issuedAt) || issuedAt > now + FUTURE_SKEW_MS || issuedAt < now - DAY_MS) {
      return failure('COMMAND_EXPIRED', 'The room command is outside its replay window.');
    }

    const authority = this.authority.currentToken();
    if (!authority) return failure('SERVICE_UNAVAILABLE', 'Room authority is temporarily unavailable.');
    if (command.authorityBootId !== authority.bootId) {
      return failure('ROOM_CLOSED', 'The room belongs to an earlier backend process.');
    }

    const payloadHash = hashCommand(command);
    const cached = this.commandCache.lookup(
      context.identity.accountId,
      command.commandId,
      payloadHash,
      now,
    );
    if (cached.kind === 'conflict') return failure('COMMAND_CONFLICT', 'The command ID was reused with a different payload.');
    if (cached.kind === 'pending') return this.resolveCachedReply(context, await cached.promise);
    if (cached.kind === 'hit') return this.resolveCachedReply(context, cached.reply);

    const recorded = await this.repository.findCommand(context.identity.accountId, command.commandId);
    if (recorded) {
      if (recorded.payloadHash !== payloadHash) {
        return failure('COMMAND_CONFLICT', 'The command ID was reused with a different payload.');
      }
      return this.replyForOutcome(context, recorded.outcome);
    }

    const reservation = this.commandCache.reserve(
      context.identity.accountId,
      command.commandId,
      payloadHash,
      now,
    );
    if (reservation.kind === 'conflict') {
      return failure('COMMAND_CONFLICT', 'The command ID was reused with a different payload.');
    }
    if (reservation.kind === 'pending') return this.resolveCachedReply(context, await reservation.promise);
    if (reservation.kind === 'full') {
      return failure('RATE_LIMITED', 'Too many retryable room commands are open for this account.');
    }

    let reply: Result<RoomReply>;
    try {
      if (command.type === 'room:create') {
        reply = await this.registry.enqueueCreate(() => this.create(
          context,
          command,
          payloadHash,
          authority,
          new Date(now),
        ));
      } else if (command.type === 'room:join') {
        const invitationHash = hashInvitation(command.token);
        const roomId = await this.repository.findRoomIdByInvitation(invitationHash);
        if (!roomId) {
          reply = await this.registry.enqueueCreate(async () => {
            const outcome = await this.repository.recordFailure({
              accountId: context.identity.accountId,
              commandId: command.commandId,
              payloadHash,
              type: command.type,
              issuedAt: new Date(command.issuedAt),
              authority,
            }, 'INVITATION_INVALID', 'The room invitation is invalid or expired.');
            return outcome.ok ? this.replyForOutcome(context, outcome) : failure(outcome.code, outcome.message);
          });
        } else {
          reply = await this.registry.enqueue(roomId, () => this.join(
            context,
            command,
            roomId,
            invitationHash,
            payloadHash,
            authority,
            new Date(now),
          ));
        }
      } else {
        reply = await this.registry.enqueue(command.roomId, () => this.executeRoomMutation(
          context,
          command,
          payloadHash,
          authority,
        ));
      }
    } catch (error) {
      const cancellation = error instanceof RoomQueueFullError
        ? failure('SERVER_BUSY', 'The room command queue is full.')
        : failure('SERVICE_UNAVAILABLE', 'The room command could not be completed.');
      this.commandCache.cancel(context.identity.accountId, command.commandId, cancellation);
      if (error instanceof RoomQueueFullError) return cancellation;
      throw error;
    }

    const cachedUntil = issuedAt + DAY_MS;
    this.commandCache.store(
      context.identity.accountId,
      command.commandId,
      payloadHash,
      cachedUntil,
      reply,
    );
    return reply;
  }

  public async disconnect(connectionId: string): Promise<void> {
    const authority = this.authority.currentToken();
    if (!authority) return;
    const roomIds = this.registry.roomsForConnection(connectionId);
    await Promise.all(roomIds.map((roomId) => this.registry.enqueue(roomId, async () => {
      const controller = this.registry.controller(roomId);
      const disconnected = this.registry.disconnect(roomId, connectionId);
      if (!disconnected) return;
      if (disconnected.controllerCleared) {
        await this.repository.disconnectController(
          roomId,
          disconnected.accountId,
          connectionId,
          controller.connectedAccountIds(),
          authority,
        );
      } else {
        await this.repository.touchConnection(roomId, authority);
      }
      if (disconnected.roomEmpty) this.scheduleEmptyClosure(roomId);
    })));
  }

  public closedReason(roomId: string): Promise<'LEFT' | 'EMPTY' | 'RESTARTED' | null> {
    return this.repository.closedReason(roomId);
  }

  public dispose(): void {
    this.disposed = true;
    for (const timer of this.emptyTimers.values()) clearTimeout(timer);
    this.emptyTimers.clear();
  }

  public onApplicationShutdown(): void {
    this.dispose();
  }

  private async create(
    context: RoomContext,
    command: Extract<RoomCommand, { type: 'room:create' }>,
    payloadHash: string,
    authority: { bootId: string; epoch: number },
    now: Date,
  ): Promise<Result<RoomReply>> {
    const token = randomBytes(32).toString('base64url');
    const invitationExpiresAt = new Date(now.getTime() + DAY_MS);
    const outcome = await this.repository.create({
      accountId: context.identity.accountId,
      commandId: command.commandId,
      payloadHash,
      type: command.type,
      issuedAt: new Date(command.issuedAt),
      roomId: newRoomId(),
      title: command.title,
      invitationHash: hashInvitation(token),
      invitationExpiresAt,
      connectionId: context.connectionId,
      displayName: context.identity.displayName,
      now,
      authority,
    });
    if (!outcome.ok) return failure(outcome.code, outcome.message);
    this.registry.setController(outcome.roomId, context.identity.accountId, context.connectionId, 1);
    this.cancelEmptyClosure(outcome.roomId);
    const projected = await this.projectForMember(outcome.roomId, context, false);
    if (projected.error) return projected;
    return success({
      room: projected.data.room,
      invitation: { token, expiresAt: invitationExpiresAt.toISOString() },
    });
  }

  private async join(
    context: RoomContext,
    command: Extract<RoomCommand, { type: 'room:join' }>,
    roomId: string,
    invitationHash: string,
    payloadHash: string,
    authority: { bootId: string; epoch: number },
    now: Date,
  ): Promise<Result<RoomReply>> {
    const outcome = await this.repository.join({
      accountId: context.identity.accountId,
      commandId: command.commandId,
      payloadHash,
      type: command.type,
      issuedAt: new Date(command.issuedAt),
      roomId,
      invitationHash,
      connectionId: context.connectionId,
      displayName: context.identity.displayName,
      now,
      authority,
    });
    if (!outcome.ok) return failure(outcome.code, outcome.message);
    if (outcome.controllerAssigned) {
      this.registry.setController(
        roomId,
        context.identity.accountId,
        context.connectionId,
        outcome.controllerEpoch ?? 1,
      );
    } else {
      const connected = this.registry.connect(roomId, context.identity.accountId, context.connectionId);
      if (connected) await this.repository.touchConnection(roomId, authority);
    }
    this.cancelEmptyClosure(roomId);
    return this.projectForMember(roomId, context, false);
  }

  private async executeRoomMutation(
    context: RoomContext,
    command: Exclude<RoomCommand, { type: 'room:create' | 'room:join' | 'room:sync' }>,
    payloadHash: string,
    authority: { bootId: string; epoch: number },
  ): Promise<Result<RoomReply>> {
    let outcome: StoredCommandOutcome;
    let invitation: { token: string; expiresAt: string } | undefined;
    if (command.type === 'room:claimControl') {
      outcome = await this.repository.claimControl({
        accountId: context.identity.accountId,
        commandId: command.commandId,
        payloadHash,
        type: command.type,
        issuedAt: new Date(command.issuedAt),
        roomId: command.roomId,
        connectionId: context.connectionId,
        authority,
      });
    } else if (command.type === 'room:takeSeat') {
      outcome = await this.repository.takeSeat({
        accountId: context.identity.accountId,
        commandId: command.commandId,
        payloadHash,
        type: command.type,
        issuedAt: new Date(command.issuedAt),
        roomId: command.roomId,
        connectionId: context.connectionId,
        controlEpoch: command.controlEpoch,
        seat: command.seat,
        authority,
      });
    } else if (command.type === 'room:rotateInvite') {
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + DAY_MS);
      outcome = await this.repository.rotateInvitation({
        accountId: context.identity.accountId,
        commandId: command.commandId,
        payloadHash,
        type: command.type,
        issuedAt: new Date(command.issuedAt),
        roomId: command.roomId,
        connectionId: context.connectionId,
        controlEpoch: command.controlEpoch,
        invitationHash: hashInvitation(token),
        invitationExpiresAt: expiresAt,
        authority,
      });
      if (outcome.ok) invitation = { token, expiresAt: expiresAt.toISOString() };
    } else if (command.type === 'room:leave') {
      const connectedAccountIds = this.registry.controller(command.roomId).connectedAccountIds();
      connectedAccountIds.delete(context.identity.accountId);
      outcome = await this.repository.leave({
        accountId: context.identity.accountId,
        commandId: command.commandId,
        payloadHash,
        type: command.type,
        issuedAt: new Date(command.issuedAt),
        roomId: command.roomId,
        connectionId: context.connectionId,
        controlEpoch: command.controlEpoch,
        connectedAccountIds,
        now: new Date(),
        authority,
      });
    } else {
      return failure('INVALID_REQUEST', 'This room command is not available yet.');
    }
    if (!outcome.ok) return failure(outcome.code, outcome.message);
    if (command.type === 'room:leave') {
      this.registry.removeAccount(command.roomId, context.identity.accountId);
      if (this.registry.controller(command.roomId).isEmpty()) this.scheduleEmptyClosure(command.roomId);
      return success({ room: null });
    }
    if (command.type === 'room:claimControl') {
      this.registry.setController(
        command.roomId,
        context.identity.accountId,
        context.connectionId,
        outcome.controllerEpoch ?? 1,
      );
    }
    const projected = await this.projectForMember(command.roomId, context, false);
    if (projected.error || !invitation) return projected;
    return success({ room: projected.data.room, invitation });
  }

  private async sync(context: RoomContext, roomId: string): Promise<Result<RoomReply>> {
    if (!this.authority.currentToken()) {
      return failure('SERVICE_UNAVAILABLE', 'Room authority is temporarily unavailable.');
    }
    return this.projectForMember(roomId, context, true);
  }

  private async projectForMember(
    roomId: string,
    context: RoomContext,
    connect: boolean,
  ): Promise<Result<RoomReply>> {
    let room = await this.repository.load(roomId);
    if (!room) return failure('ROOM_CLOSED', 'The room is no longer available.');
    if (!room.members.some(({ accountId }) => accountId === context.identity.accountId)) {
      return failure('FORBIDDEN', 'Only room members can view this room.');
    }
    if (connect) {
      const connected = this.registry.connect(roomId, context.identity.accountId, context.connectionId);
      this.cancelEmptyClosure(roomId);
      if (connected) {
        const authority = this.authority.currentToken();
        if (!authority) {
          this.registry.disconnect(roomId, context.connectionId);
          return failure('SERVICE_UNAVAILABLE', 'Room authority is temporarily unavailable.');
        }
        let touched: boolean;
        try {
          touched = await this.repository.touchConnection(roomId, authority);
        } catch (error) {
          this.registry.disconnect(roomId, context.connectionId);
          throw error;
        }
        if (!touched) {
          this.registry.disconnect(roomId, context.connectionId);
          return failure('ROOM_CLOSED', 'The room is no longer available.');
        }
        room = await this.repository.load(roomId);
        if (!room) return failure('ROOM_CLOSED', 'The room is no longer available.');
      }
    }
    const controller = this.registry.controller(roomId);
    const roomForRecipient = {
      ...room,
      members: room.members.map((member) => {
        const activeController = controller.controller(member.accountId);
        return {
          ...member,
          connected: controller.isConnected(member.accountId),
          controllerConnectionId: activeController?.connectionId ?? null,
          controllerEpoch: activeController?.epoch ?? member.controllerEpoch,
        };
      }),
    };
    const view = projectRoom(roomForRecipient, context.identity.accountId, context.connectionId);
    return success({ room: view });
  }

  private async replyForOutcome(
    context: RoomContext,
    outcome: StoredCommandOutcome,
  ): Promise<Result<RoomReply>> {
    if (!outcome.ok) return failure(outcome.code, outcome.message);
    if (outcome.roomNull) return success({ room: null });
    return this.projectForMember(outcome.roomId, context, false);
  }

  private async resolveCachedReply(
    context: RoomContext,
    reply: Result<RoomReply>,
  ): Promise<Result<RoomReply>> {
    if (reply.error || !reply.data.room) return reply;
    const projected = await this.projectForMember(reply.data.room.roomId, context, true);
    if (projected.error) return projected;
    return success({
      room: projected.data.room,
      ...(reply.data.invitation ? { invitation: reply.data.invitation } : {}),
    });
  }

  private scheduleEmptyClosure(roomId: string): void {
    if (this.disposed || this.emptyTimers.has(roomId)) return;
    const timer = setTimeout(() => {
      this.emptyTimers.delete(roomId);
      void this.closeIfStillEmpty(roomId).catch(() => this.scheduleEmptyClosure(roomId));
    }, this.emptyRetentionMs);
    timer.unref();
    this.emptyTimers.set(roomId, timer);
  }

  private cancelEmptyClosure(roomId: string): void {
    const timer = this.emptyTimers.get(roomId);
    if (timer) clearTimeout(timer);
    this.emptyTimers.delete(roomId);
  }

  private async closeIfStillEmpty(roomId: string): Promise<void> {
    if (!this.registry.controller(roomId).isEmpty()) return;
    const authority = this.authority.currentToken();
    if (!authority) {
      this.scheduleEmptyClosure(roomId);
      return;
    }
    await this.registry.enqueue(roomId, async () => {
      if (!this.registry.controller(roomId).isEmpty()) return;
      await this.repository.closeEmpty(roomId, authority, new Date());
      this.registry.remove(roomId);
    });
  }
}

function hashInvitation(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function hashCommand(command: RoomCommand): string {
  return createHash('sha256').update(canonicalJson(command)).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function success(data: RoomReply): Result<RoomReply> {
  return { data, error: null };
}

function failure(code: string, message: string): Result<RoomReply> {
  return { data: null, error: { code, message } };
}
