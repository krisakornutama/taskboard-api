import { randomBytes } from 'node:crypto';

import 'dotenv/config';

export type NodeEnv = 'development' | 'test' | 'production';

export interface Config {
  env: NodeEnv;
  port: number;
  host: string;
  dbPath: string;
  corsOrigin: string;
  jwt: {
    secret: string;
    accessTtl: string;
    refreshTtlDays: number;
  };
  rateLimit: {
    loginMax: number;
    loginWindowMs: number;
  };
  seedAdmin: {
    email: string | null;
    password: string | null;
    name: string;
  };
}

function readString(key: string, fallback: string): string {
  const raw = process.env[key];
  return raw === undefined || raw === '' ? fallback : raw;
}

function readInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer for environment variable ${key}: "${raw}"`);
  }
  return parsed;
}

function readNullable(key: string): string | null {
  const raw = process.env[key];
  return raw === undefined || raw === '' ? null : raw;
}

function resolveEnv(): NodeEnv {
  const raw = readString('NODE_ENV', 'development');
  if (raw === 'development' || raw === 'test' || raw === 'production') return raw;
  return 'development';
}

/**
 * Loads configuration from the environment and validates the invariants that a
 * production deployment must satisfy. Fail-fast beats a server that boots with
 * an attacker-guessable signing key.
 */
export function loadConfig(env: NodeEnv = resolveEnv()): Config {
  const isProduction = env === 'production';

  let secret = readNullable('JWT_SECRET');
  if (secret === null) {
    if (isProduction) {
      throw new Error(
        'JWT_SECRET is required when NODE_ENV=production. ' +
          'Generate one with: node -e "console.log(require(\'node:crypto\').randomBytes(48).toString(\'hex\'))"',
      );
    }
    secret = randomBytes(48).toString('hex');
    if (env !== 'test') {
      console.warn(
        '[config] JWT_SECRET is not set. Generated an ephemeral secret for this ' +
          'process; all tokens issued before a restart become invalid.',
      );
    }
  } else if (isProduction && secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }

  const refreshTtlDays = readInt('REFRESH_TOKEN_TTL_DAYS', 7);
  if (refreshTtlDays < 1) {
    throw new Error('REFRESH_TOKEN_TTL_DAYS must be >= 1');
  }

  const loginWindowMs = readInt('LOGIN_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000);
  const loginMax = readInt('LOGIN_RATE_LIMIT_MAX', 5);
  if (loginMax < 1) throw new Error('LOGIN_RATE_LIMIT_MAX must be >= 1');
  if (loginWindowMs < 1) throw new Error('LOGIN_RATE_LIMIT_WINDOW_MS must be >= 1');

  const port = readInt('PORT', 3000);
  if (port < 0 || port > 65535) throw new Error(`PORT out of range: ${port}`);

  return {
    env,
    port,
    host: readString('HOST', '0.0.0.0'),
    dbPath: readString('DB_PATH', './data/taskboard.sqlite'),
    corsOrigin: readString('CORS_ORIGIN', '*'),
    jwt: {
      secret,
      accessTtl: readString('ACCESS_TOKEN_TTL', '15m'),
      refreshTtlDays,
    },
    rateLimit: { loginMax, loginWindowMs },
    seedAdmin: {
      email: readNullable('SEED_ADMIN_EMAIL'),
      password: readNullable('SEED_ADMIN_PASSWORD'),
      name: readString('SEED_ADMIN_NAME', 'Platform Admin'),
    },
  };
}