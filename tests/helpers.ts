import supertest from 'supertest';
import type { Express } from 'express';

import { createApp, getCtx } from '../src/app.js';
import { loadConfig, type Config } from '../src/config.js';
import { closeDatabase, openDatabase, type Db } from '../src/db/index.js';
import type { Ctx } from '../src/types.js';

/** Fixed secret so tokens are reproducible within a test run. */
const TEST_SECRET = 'test-secret-not-used-in-production-0123456789abcdef';

export interface TestHarness {
  app: Express;
  db: Db;
  ctx: Ctx;
  config: Config;
  /** Clears rate-limiter state so throttling tests do not bleed into others. */
  resetRateLimits: () => void;
  /** Empties every table without dropping the schema. */
  resetDatabase: () => void;
  close: () => void;
  agent: () => supertest.Agent;
}

export function createTestApp(overrides: Partial<Config> = {}): TestHarness {
  const base = loadConfig('test');
  const config: Config = {
    ...base,
    dbPath: ':memory:',
    corsOrigin: '*',
    jwt: { ...base.jwt, secret: TEST_SECRET },
    seedAdmin: { email: null, password: null, name: 'Platform Admin' },
    ...overrides,
  };

  const db = openDatabase(':memory:');
  const app = createApp({ db, config });
  const ctx = getCtx();

  return {
    app,
    db,
    ctx,
    config,
    resetRateLimits: () => ctx.resetRateLimits(),
    resetDatabase: () => {
      db.exec(
        'DELETE FROM tasks; DELETE FROM projects; DELETE FROM refresh_tokens; DELETE FROM users;',
      );
    },
    close: () => closeDatabase(db),
    agent: () => supertest(app),
  };
}

export interface TestUser {
  id: number;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

/** Registers a user through the public API (no direct DB writes). */
export async function registerUser(
  api: supertest.Agent,
  overrides: Partial<{ email: string; password: string; name: string }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `user-${Math.random().toString(36).slice(2, 10)}@example.com`;
  const password = overrides.password ?? 'correct horse battery staple';
  const name = overrides.name ?? 'Test User';

  const response = await api.post('/api/auth/register').send({ email, password, name });
  if (response.status !== 201) {
    throw new Error(`registerUser failed with ${response.status}: ${JSON.stringify(response.body)}`);
  }

  return {
    id: response.body.user.id,
    email: response.body.user.email,
    name: response.body.user.name,
    accessToken: response.body.tokens.accessToken,
    refreshToken: response.body.tokens.refreshToken,
  };
}

/** Promotes an existing user to `admin` so RBAC paths can be exercised. */
export function promoteToAdmin(db: Db, userId: number): void {
  db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(userId);
}

export function bearer(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}