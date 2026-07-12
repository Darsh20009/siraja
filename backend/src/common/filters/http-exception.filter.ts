import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Normalizes all HTTP error responses to a consistent envelope and logs
 * every error centrally — the single choke point for production error
 * visibility (Beta readiness requirement) without pulling in an external
 * error-tracking service yet:
 *   - 5xx (unexpected/unhandled): logged at `error` with the full stack,
 *     since these represent bugs that need investigation.
 *   - 4xx (expected client errors — validation, auth, not-found, etc.):
 *     logged at `warn` with just the message, to keep signal high; these
 *     are normal traffic, not incidents.
 * Wired globally in `main.ts` via `useGlobalFilters`.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const logLine = `${request.method} ${request.url} -> ${status}`;
    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(logLine, stack);
    } else {
      this.logger.warn(`${logLine} — ${typeof message === 'string' ? message : JSON.stringify(message)}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
