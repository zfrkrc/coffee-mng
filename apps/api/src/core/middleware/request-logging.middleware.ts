/**
 * Request-scoped structured logging middleware.
 *
 * Assigns a correlation id per request, logs method/path/status/duration, and
 * attaches the correlation id to the response header so the web client can
 * correlate errors across the stack.
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Logger } from '@cafeos/shared';

const logger = new Logger({ nodeId: 'cafe-api' });

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? randomUUID();
    (req as Request & { correlationId?: string }).correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    const start = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      logger.info('http', {
        correlationId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        remoteAddr: req.ip,
      });
    });
    next();
  }
}
