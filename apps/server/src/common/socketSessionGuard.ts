import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Socket } from 'socket.io';

import {
  IdentityService,
  toWebHeaders,
  type VerifiedAccountIdentity,
} from '../modules/identity/identity.service';

export type AuthenticatedSocket = Socket & {
  data: Socket['data'] & { verifiedIdentity: VerifiedAccountIdentity };
};

@Injectable()
export class SocketSessionGuard implements CanActivate {
  public constructor(private readonly identity: IdentityService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket = context.switchToWs().getClient<Socket>();
    let resolved;
    try {
      resolved = await this.identity.resolve(toWebHeaders(socket.handshake.headers));
    } catch {
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Session verification is temporarily unavailable.',
      });
    }
    if (!resolved) {
      setImmediate(() => socket.disconnect(true));
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'A valid session is required.',
      });
    }

    (socket as AuthenticatedSocket).data.verifiedIdentity = resolved;
    return true;
  }
}
