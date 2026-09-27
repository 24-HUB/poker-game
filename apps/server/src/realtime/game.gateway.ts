import { UseFilters, UseGuards } from '@nestjs/common';
import { Ack, ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { z } from 'zod';

import { SocketAckFilter } from '../common/socketAckFilter';
import { SocketSessionGuard, type AuthenticatedSocket } from '../common/socketSessionGuard';
import { ZodValidationPipe } from '../common/zodValidationPipe';

type ConnectionCheckResult =
  | { data: { accountId: string }; error: null }
  | { data: null; error: { code: string; message: string } };

const connectionCheckSchema = z.object({ accountId: z.string().optional() }).strict();

@WebSocketGateway({ path: '/socket.io', serveClient: false })
@UseFilters(new SocketAckFilter())
@UseGuards(SocketSessionGuard)
export class GameGateway {
  @SubscribeMessage('connection:check')
  public checkConnection(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(connectionCheckSchema)) _payload: unknown,
    @Ack() acknowledge?: (result: ConnectionCheckResult) => void,
  ): void {
    acknowledge?.({ data: { accountId: socket.data.verifiedIdentity.accountId }, error: null });
  }
}
