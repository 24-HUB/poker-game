import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  IdentityService,
  toWebHeaders,
  type VerifiedAccountIdentity,
} from '../modules/identity/identity.service';

export type AuthenticatedRequest = Request & { verifiedIdentity: VerifiedAccountIdentity };

@Injectable()
export class HttpSessionGuard implements CanActivate {
  public constructor(private readonly identity: IdentityService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    let resolved;
    try {
      resolved = await this.identity.resolve(toWebHeaders(request.headers));
    } catch {
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Session verification is temporarily unavailable.',
      });
    }
    if (!resolved) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'A valid session is required.',
      });
    }

    (request as AuthenticatedRequest).verifiedIdentity = resolved;
    return true;
  }
}
