import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HttpError } from '../lib/http-error.js';

/**
 * Fixed-window rate limiter, keyed by client IP.
 *
 * Deliberately implemented in-process with no dependency: it is ~30 lines, has no
 * supply-chain surface, and the semantics are easy to assert in tests. For a
 * multi-instance deployment, swap the `Map` for Redis — the interface here
 * (`createRateLimiter`) is the only thing that would change.
 */
export interface RateLimiter {
  middleware: RequestHandler;
  reset: () => void;
}

export function createRateLimiter(options: {
  max: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}): RateLimiter {
  const { max, windowMs, keyGenerator, message } = options;
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Bound memory: drop expired buckets whenever the map grows past 10k entries.
  function sweep(now: number): void {
    if (hits.size < 10_000) return;
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }

  const middleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    sweep(now);

    const key = keyGenerator ? keyGenerator(req) : (req.ip ?? req.socket.remoteAddress ?? 'unknown');
    const existing = hits.get(key);

    let count: number;
    let resetAt: number;

    if (!existing || existing.resetAt <= now) {
      count = 1;
      resetAt = now + windowMs;
      hits.set(key, { count, resetAt });
    } else {
      existing.count += 1;
      count = existing.count;
      resetAt = existing.resetAt;
    }

    // Emitted on every response, including the first request of a window, so a
    // client can always see its remaining budget.
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

    if (count > max) {
      next(HttpError.tooManyRequests(message ?? 'Too many requests. Please try again later.', (resetAt - now) / 1000));
      return;
    }

    next();
  };

  return { middleware, reset: () => hits.clear() };
}