import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HttpError } from '../lib/http-error.js';
import { verifyAccessToken } from '../lib/jwt.js';
import type { Ctx, Role } from '../types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: number; email: string; role: Role };
    }
  }
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, ...rest] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return null;
  const token = rest.join(' ').trim();
  return token.length > 0 ? token : null;
}

/**
 * Rejects the request unless a valid, unexpired access token is present.
 *
 * The token proves *who* the caller claims to be; the database decides what they
 * may actually do. Resolving the account on every request costs one indexed
 * lookup but means a role change or account deletion takes effect immediately,
 * instead of lingering until the access token expires.
 */
export function requireAuth(ctx: Ctx): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const token = extractBearer(req.header('authorization'));
    if (!token) {
      next(
        new HttpError(401, 'UNAUTHORIZED', 'Missing bearer token.', {
          headers: { 'WWW-Authenticate': 'Bearer' },
        }),
      );
      return;
    }

    const result = verifyAccessToken(token, ctx.config.jwt.secret);
    if (!result.ok) {
      next(
        result.reason === 'expired'
          ? HttpError.unauthorized('Access token has expired.', 'TOKEN_EXPIRED')
          : HttpError.unauthorized('Access token is invalid.', 'TOKEN_INVALID'),
      );
      return;
    }

    const userId = Number.parseInt(result.payload.sub, 10);
    if (!Number.isSafeInteger(userId)) {
      next(HttpError.unauthorized('Access token is invalid.', 'TOKEN_INVALID'));
      return;
    }

    const account = ctx.db
      .prepare('SELECT id, email, role FROM users WHERE id = ?')
      .get(userId) as unknown as { id: number; email: string; role: Role } | undefined;

    if (!account) {
      next(HttpError.unauthorized('Account no longer exists.', 'TOKEN_INVALID'));
      return;
    }

    req.auth = { userId: account.id, email: account.email, role: account.role };
    next();
  };
}

/** Must be mounted after `requireAuth`. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new Error('requireRole used without requireAuth'));
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(
        HttpError.forbidden(`This action requires one of the roles: ${roles.join(', ')}.`),
      );
      return;
    }
    next();
  };
}