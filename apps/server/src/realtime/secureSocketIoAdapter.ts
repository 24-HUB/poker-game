import type { IncomingMessage } from 'node:http';

import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import type { Server, ServerOptions } from 'socket.io';

import { verifyProxyRequest, verifyPublicOrigin } from '../common/proxyGuard';

type AllowRequest = (request: IncomingMessage, callback: (message: string | null, success: boolean) => void) => void;

export class SecureSocketIoAdapter extends IoAdapter {
  public constructor(application: INestApplicationContext) {
    super(application);
  }

  public override createIOServer(
    port: number,
    options: Partial<ServerOptions> & { namespace?: string; server?: unknown } = {},
  ): Server {
    const configuredAllowRequest = options.allowRequest as AllowRequest | undefined;
    const allowRequest: AllowRequest = (request, callback) => {
      if (!verifyProxyRequest(request.headers) || !verifyPublicOrigin(request.headers)) {
        callback('Forbidden', false);
        return;
      }
      if (configuredAllowRequest) {
        configuredAllowRequest(request, callback);
        return;
      }
      callback(null, true);
    };

    return super.createIOServer(port, {
      ...options,
      serveClient: false,
      allowRequest,
    }) as Server;
  }
}
