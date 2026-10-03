import type { ErrorRequestHandler, RequestHandler } from 'express';

import { HttpError } from '../lib/http-error.js';

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Terminal 404 handler for unmatched routes. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.path}`));
};

/**
 * Translates thrown errors into a single JSON envelope. Unknown errors become a
 * generic 500 with no internal detail leaked to the client; the real cause is
 * logged server-side.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Errors raised by `express.json()` / `express.urlencoded()` before any route
  // handler runs. They carry a `type` discriminator and must not be reported as
  // server faults.
  const bodyParserType = (err as { type?: string } | undefined)?.type;
  if (bodyParserType === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } });
    return;
  }
  if (bodyParserType === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the size limit.' } });
    return;
  }

  const isHttpError = err instanceof HttpError;
  const status = isHttpError ? err.status : 500;

  if (!isHttpError) {
    console.error('[error] Unhandled error:', err);
  } else if (status >= 500) {
    console.error('[error] Server error:', err.message, err.cause ?? '');
  }

  if (isHttpError && err.headers) {
    for (const [header, value] of Object.entries(err.headers)) {
      res.setHeader(header, value);
    }
  }

  const body: ErrorBody = {
    error: {
      code: isHttpError ? err.code : 'INTERNAL_ERROR',
      // Never expose raw stack traces or driver messages to clients.
      message: isHttpError ? err.message : 'Internal server error.',
    },
  };

  if (isHttpError && err.details !== undefined) {
    body.error.details = err.details;
  }

  res.status(status).json(body);
};