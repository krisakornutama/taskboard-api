import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import helmet from 'helmet';

import { loadConfig, type Config } from './config.js';
import { openDatabase, type Db } from './db/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { seedAdmin } from './modules/auth/auth.service.js';
import { projectRoutes } from './modules/projects/project.routes.js';
import type { Ctx } from './types.js';

export interface AppOptions {
  db: Db;
  config: Config;
}

/**
 * Stateless request-context holder, so tests and the bootstrap path can reach the
 * live database while route handlers receive their dependencies via closures.
 */
let currentCtx: Ctx | null = null;

export function getCtx(): Ctx {
  if (!currentCtx) throw new Error('Application context has not been created.');
  return currentCtx;
}

export function createApp(options: AppOptions): Express {
  const ctx: Ctx = {
    db: options.db,
    config: options.config,
    resetRateLimits: () => {},
  };
  currentCtx = ctx;

  seedAdmin(ctx);

  const app = express();

  app.disable('x-powered-by');
  // Allows correct client IPs (and therefore rate limiting) behind a proxy/load
  // balancer. Only enable when actually deployed behind one.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin:
        options.config.corsOrigin === '*'
          ? true
          : options.config.corsOrigin.split(',').map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  const startedAt = Date.now();

  const healthHandler: RequestHandler = (_req, res) => {
    // A trivial query proves the database is reachable, not merely open.
    ctx.db.prepare('SELECT 1 AS ok').get();
    res.json({
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      environment: options.config.env,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  app.use('/api/auth', authRoutes(ctx));
  app.use('/api', projectRoutes(ctx));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/** Shared startup path used by `server.ts` and the test-suite. */
export function bootstrap(overrides?: Partial<Config>): { app: Express; ctx: Ctx; config: Config; db: Db } {
  const config: Config = { ...loadConfig(), ...overrides };
  const db = openDatabase(config.dbPath);
  const app = createApp({ db, config });
  return { app, ctx: getCtx(), config, db };
}