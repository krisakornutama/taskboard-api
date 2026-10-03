import { Router } from 'express';

import { HttpError } from '../../lib/http-error.js';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rate-limit.js';
import { validate } from '../../middleware/validate.js';
import type { Ctx } from '../../types.js';
import {
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema,
  type LoginBody,
  type RefreshBody,
  type RegisterBody,
} from './auth.schema.js';
import { findUserById, login, logout, logoutAll, refresh, register } from './auth.service.js';

export function authRoutes(ctx: Ctx): Router {
  const router = Router();

  // Per-IP throttle on credential endpoints to slow brute-force attempts.
  const loginLimiter = createRateLimiter({
    max: ctx.config.rateLimit.loginMax,
    windowMs: ctx.config.rateLimit.loginWindowMs,
    message: 'Too many authentication attempts. Please try again later.',
  });

  // Tests need a deterministic starting point for the limiter.
  const previousReset = ctx.resetRateLimits;
  ctx.resetRateLimits = () => {
    previousReset();
    loginLimiter.reset();
  };

  router.post('/register', validate({ body: registerBodySchema }), (req, res) => {
    const body = req.body as RegisterBody;
    const result = register(ctx, body);
    res.status(201).json(result);
  });

  router.post('/login', loginLimiter.middleware, validate({ body: loginBodySchema }), (req, res) => {
    const body = req.body as LoginBody;
    res.json(login(ctx, body));
  });

  router.post('/refresh', validate({ body: refreshBodySchema }), (req, res) => {
    const body = req.body as RefreshBody;
    res.json(refresh(ctx, body.refreshToken));
  });

  router.post('/logout', requireAuth(ctx), validate({ body: refreshBodySchema }), (req, res) => {
    const body = req.body as RefreshBody;
    logout(ctx, req.auth!.userId, body.refreshToken);
    res.status(204).send();
  });

  router.post('/logout-all', requireAuth(ctx), (req, res) => {
    logoutAll(ctx, req.auth!.userId);
    res.status(204).send();
  });

  router.get('/me', requireAuth(ctx), (req, res) => {
    const user = findUserById(ctx, req.auth!.userId);
    if (!user) throw HttpError.unauthorized('Account no longer exists.', 'TOKEN_INVALID');
    res.json({ data: user });
  });

  return router;
}