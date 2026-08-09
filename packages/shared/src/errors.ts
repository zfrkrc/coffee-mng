/**
 * Centralized error model for CafeOS Edge.
 *
 * All errors raised by the API layer pass through AppError. A global
 * exception filter translates them into a consistent HTTP shape. Internal
 * errors never leak stack traces to clients.
 */

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'INTERNAL'
  | 'LICENSE_INVALID'
  | 'LICENSE_EXPIRED'
  | 'OFFLINE_UNREACHABLE'
  | 'PRECONDITION_FAILED';

export interface AppErrorParams {
  code: ErrorCode;
  message: string;
  httpStatus: number;
  /** Machine-readable detail for debugging; never shown to end users. */
  detail?: unknown;
  /** Optional field-level validation errors. */
  fieldErrors?: Record<string, string>;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly detail?: unknown;
  readonly fieldErrors?: Record<string, string>;

  constructor(params: AppErrorParams) {
    super(params.message);
    this.name = 'AppError';
    this.code = params.code;
    this.httpStatus = params.httpStatus;
    this.detail = params.detail;
    this.fieldErrors = params.fieldErrors;
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError({ code: 'UNAUTHORIZED', message, httpStatus: 401 });
  }

  static forbidden(message = 'You do not have permission to perform this action'): AppError {
    return new AppError({ code: 'FORBIDDEN', message, httpStatus: 403 });
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError({ code: 'NOT_FOUND', message, httpStatus: 404 });
  }

  static conflict(message: string): AppError {
    return new AppError({ code: 'CONFLICT', message, httpStatus: 409 });
  }

  static validation(message: string, fieldErrors?: Record<string, string>): AppError {
    return new AppError({ code: 'VALIDATION', message, httpStatus: 422, fieldErrors });
  }

  static rateLimited(message = 'Too many requests'): AppError {
    return new AppError({ code: 'RATE_LIMITED', message, httpStatus: 429 });
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError({ code: 'INTERNAL', message, httpStatus: 500 });
  }

  static precondition(message: string): AppError {
    return new AppError({ code: 'PRECONDITION_FAILED', message, httpStatus: 412 });
  }
}

/** Maps a thrown value to an AppError (used by the global exception filter). */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    // Validation library errors are wrapped by callers; anything else is internal.
    return AppError.internal(error.message);
  }
  return AppError.internal();
}
