import { UseFilters, UseGuards, type BeforeApplicationShutdown } from '@nestjs/common';
import {
  Ack,
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Result, RoomCommand, RoomReply } from '@poker/contracts' with { 'resolution-mode': 'import' };
import type { Server, Socket } from 'socket.io';

import { AuthorityLease } from '../authority/authorityLease';
import { SocketAckFilter } from '../common/socketAckFilter';
import { SocketSessionGuard, type AuthenticatedSocket } from '../common/socketSessionGuard';
import { IdentityService, toWebHeaders } from '../modules/identity/identity.service';
import { RoomService } from '../modules/rooms/room.service';
import { CommandRateLimiter } from './commandRateLimiter';
import { RoomCommandPipe } from './roomCommandPipe';
import { RoomPublisher } from './roomPublisher';

type RoomAck = (result: Result<RoomReply>) => void;

@WebSocketGateway({ path: '/socket.io', serveClient: false })
@UseFilters(new SocketAckFilter())
@UseGuards(SocketSessionGuard)
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, BeforeApplicationShutdown {
  private readonly disconnectOperations = new Set<Promise<void>>();
  private shuttingDown = false;

  public constructor(
    private readonly identity: IdentityService,
    private readonly rooms: RoomService,
    private readonly authority: AuthorityLease,
    private readonly rateLimiter: CommandRateLimiter,
    private readonly publisher: RoomPublisher,
  ) {}

  public afterInit(server: Server): void {
    this.publisher.attach(server);
  }

  public async handleConnection(socket: Socket): Promise<void> {
    let identity;
    try {
      identity = await this.identity.resolve(toWebHeaders(socket.handshake.headers));
    } catch {
      return;
    }
    if (!identity) return;
    if (!this.rateLimiter.registerSocket(identity.accountId, socket.id)) {
      socket.disconnect(true);
      return;
    }
    socket.data.verifiedIdentity = identity;
    const authority = this.authority.currentToken();
    if (authority) socket.emit('connection:ready', { authorityBootId: authority.bootId });
  }

  public handleDisconnect(socket: Socket): void {
    this.rateLimiter.unregisterSocket(socket.id);
    if (this.shuttingDown) return;
    const operation = this.rooms.disconnect(socket.id)
      .catch(() => undefined)
      .finally(() => this.disconnectOperations.delete(operation));
    this.disconnectOperations.add(operation);
  }

  public async beforeApplicationShutdown(): Promise<void> {
    this.shuttingDown = true;
    await Promise.allSettled(this.disconnectOperations);
  }

  @SubscribeMessage('room:create')
  public create(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody(new RoomCommandPipe('room:create')) command: RoomCommand,
    @Ack() ack?: RoomAck,
  ) { return this.handle(socket, command, ack); }

  @SubscribeMessage('room:join')
  public join(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody(new RoomCommandPipe('room:join')) command: RoomCommand,
    @Ack() ack?: RoomAck,
  ) { return this.handle(socket, command, ack); }

  @SubscribeMessage('room:sync')
  public sync(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody(new RoomCommandPipe('room:sync')) command: RoomCommand,
    @Ack() ack?: RoomAck,
  ) { return this.handle(socket, command, ack); }

  @SubscribeMessage('room:takeSeat')
  public takeSeat(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody(new RoomCommandPipe('room:takeSeat')) command: RoomCommand,
    @Ack() ack?: RoomAck,
  ) { return this.handle(socket, command, ack); }

  @SubscribeMessage('room:leave')
  public leave(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody(new RoomCommandPipe('room:leave')) command: RoomCommand,
    @Ack() ack?: RoomAck,
  ) { return this.handle(socket, command, ack); }

  @SubscribeMessage('room:rotateInvite')
  public rotateInvite(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody(new RoomCommandPipe('room:rotateInvite')) command: RoomCommand,
    @Ack() ack?: RoomAck,
  ) { return this.handle(socket, command, ack); }

  @SubscribeMessage('room:claimControl')
  public claimControl(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody(new RoomCommandPipe('room:claimControl')) command: RoomCommand,
    @Ack() ack?: RoomAck,
  ) { return this.handle(socket, command, ack); }

  private async handle(socket: AuthenticatedSocket, command: RoomCommand, ack?: RoomAck): Promise<void> {
    const identity = socket.data.verifiedIdentity;
    if (!this.rateLimiter.registerSocket(identity.accountId, socket.id)
      || !this.rateLimiter.allow(identity.accountId, command.type)) {
      ack?.({ data: null, error: { code: 'RATE_LIMITED', message: 'Too many room commands.' } });
      return;
    }
    const result = await this.rooms.execute({ identity, connectionId: socket.id }, command);
    ack?.(result);
    try {
      const roomId = result.data?.room?.roomId ?? ('roomId' in command ? command.roomId : null);
      if (command.type === 'room:leave' && result.error === null) {
        socket.emit('room:closed', { roomId: command.roomId, reason: 'LEFT' });
      } else if (command.type === 'room:sync' && result.error?.code === 'ROOM_CLOSED') {
        const reason = await this.rooms.closedReason(command.roomId);
        if (reason) socket.emit('room:closed', { roomId: command.roomId, reason });
      }
      if (result.error === null && roomId) await this.publisher.publish(roomId);
    } catch {
      // Publication follows the committed reply and must never trigger a second acknowledgement.
    }
  }
}
