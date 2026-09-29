import { ArgumentsHost, Catch, HttpException, type ExceptionFilter } from '@nestjs/common';

type SocketErrorResult = {
  data: null;
  error: { code: string; message: string };
};

@Catch()
export class SocketAckFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const args = host.getArgs();
    let acknowledgement: ((result: SocketErrorResult) => void) | undefined;
    for (let index = args.length - 1; index >= 0; index -= 1) {
      if (typeof args[index] === 'function') {
        acknowledgement = args[index] as (result: SocketErrorResult) => void;
        break;
      }
    }
    if (!acknowledgement) return;

    const details = exception instanceof HttpException ? exception.getResponse() : undefined;
    const supplied = typeof details === 'object' && details !== null ? details as Record<string, unknown> : {};
    acknowledgement({
      data: null,
      error: {
        code: typeof supplied.code === 'string' ? supplied.code : 'INTERNAL_ERROR',
        message: typeof supplied.message === 'string'
          ? supplied.message
          : 'The socket command could not be completed.',
      },
    });
  }
}
