/**
 * Transport-agnostic application error. Thrown anywhere in a request handler and
 * translated into a consistent JSON envelope by `errorHandler`.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly headers?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: { details?: unknown; headers?: Record<string, string>; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    if (options?.details !== undefined) this.details = options.details;
    if (options?.headers !== undefined) this.headers = options.headers;
  }

  static badRequest(message: string, details?: unknown): HttpError {
    return new HttpError(400, 'BAD_REQUEST', message, { details });
  }

  static validation(message: string, details?: unknown): HttpError {
    return new HttpError(422, 'VALIDATION_ERROR', message, { details });
  }

  static unauthorized(message = 'Authentication required.', code = 'UNAUTHORIZED'): HttpError {
    return new HttpError(401, code, message);
  }

  static forbidden(message = 'You do not have access to this resource.'): HttpError {
    return new HttpError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found.'): HttpError {
    return new HttpError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string): HttpError {
    return new HttpError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message: string, retryAfterSeconds: number): HttpError {
    return new HttpError(429, 'RATE_LIMITED', message, {
      headers: { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterSeconds))) },
    });
  }

  static internal(message = 'Internal server error.', cause?: unknown): HttpError {
    return new HttpError(500, 'INTERNAL_ERROR', message, { cause });
  }
}