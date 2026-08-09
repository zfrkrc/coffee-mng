/**
 * Global exception filter.
 *
 * Translates every thrown error into a consistent JSON shape:
 *   { error: { code, message, fieldErrors?, detail? } }
 * AppError carries explicit codes/status; unexpected errors become INTERNAL
 * (500) and never leak stack traces or internals to clients.
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AppError, toAppError } from '@cafeos/shared';
import { Logger } from '@cafeos/shared';

const logger = new Logger({ nodeId: 'cafe-api' });

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ method?: string; url?: string; ip?: string; correlationId?: string }>();

    const appError = this.resolve(exception);
    const correlationId = req.correlationId ?? 'n/a';

    // Log server-side with full detail; never forward internals to the client.
    if (appError.httpStatus >= 500) {
      logger.error(`request failed ${req.method} ${req.url}`, {
        correlationId,
        code: appError.code,
        detail: appError.detail ?? (exception instanceof Error ? exception.message : undefined),
        status: appError.httpStatus,
        remoteAddr: req.ip,
      });
    } else {
      logger.debug(`request rejected ${req.method} ${req.url}`, {
        correlationId,
        code: appError.code,
        status: appError.httpStatus,
      });
    }

    const body = {
      error: {
        code: appError.code,
        message: appError.message,
        fieldErrors: appError.fieldErrors,
        correlationId,
      },
    };
    res.status(appError.httpStatus).json(body);
  }

  private resolve(exception: unknown): AppError {
    if (exception instanceof AppError) return exception;
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();
      const message =
        typeof resp === 'string'
          ? resp
          : (resp as { message?: string | string[] })?.message?.toString?.() ?? exception.message;
      return new AppError({
        code: status === HttpStatus.UNAUTHORIZED ? 'UNAUTHORIZED' : 'INTERNAL',
        message,
        httpStatus: status,
      });
    }
    return toAppError(exception);
  }
}
