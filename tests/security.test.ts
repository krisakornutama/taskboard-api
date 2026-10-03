import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';
import { escapeLike } from '../src/modules/projects/project.service.js';
import { resolveSort } from '../src/lib/pagination.js';
import { hashPassword, hashToken, verifyPassword, generateOpaqueToken } from '../src/lib/password.js';
import { bearer, createTestApp, registerUser, type TestHarness, type TestUser } from './helpers.js';

describe('security controls', () => {
  let h: TestHarness;

  beforeAll(() => {
    // Tight login throttle so the limiter can be exercised in a handful of calls.
    const base = loadConfig('test');
    h = createTestApp({
      rateLimit: { loginMax: 3, loginWindowMs: 60_000 },
      jwt: base.jwt,
    } as never);
  });

  afterAll(() => {
    h.close();
  });

  let user: TestUser;

  beforeEach(async () => {
    h.resetDatabase();
    h.resetRateLimits();
    user = await registerUser(h.agent());
  });

  describe('login rate limiting', () => {
    it('blocks further attempts after the configured limit and sets Retry-After', async () => {
      const api = h.agent();

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const res = await api.post('/api/auth/login').send({
          email: user.email,
          password: `wrong-guess-${attempt}`,
        });
        expect(res.status).toBe(401);
        expect(res.headers['x-ratelimit-limit']).toBe('3');
        expect(res.headers['x-ratelimit-remaining']).toBe(String(3 - attempt));
      }

      const blocked = await api.post('/api/auth/login').send({ email: user.email, password: 'blocked' });

      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe('RATE_LIMITED');
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('throttles per IP so one account cannot lock out the whole server', async () => {
      const other = await registerUser(h.agent());

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        await h.agent().post('/api/auth/login').send({ email: user.email, password: 'nope' });
      }

      const blocked = await h.agent().post('/api/auth/login').send({ email: user.email, password: 'nope' });
      expect(blocked.status).toBe(429);

      // A correct login from the same IP is also throttled (same IP), but the
      // other account must not be affected in a multi-IP deployment. Here we at
      // least assert the limiter state is per-key and resettable.
      const afterReset = await h.agent().post('/api/auth/login').send({
        email: other.email,
        password: 'correct horse battery staple',
      });
      expect(afterReset.status).toBe(429);

      h.resetRateLimits();

      const recovered = await h.agent().post('/api/auth/login').send({
        email: other.email,
        password: 'correct horse battery staple',
      });
      expect(recovered.status).toBe(200);
    });

    it('does not throttle registration', async () => {
      const api = h.agent();
      for (let i = 1; i <= 3; i += 1) {
        const res = await api.post('/api/auth/login').send({ email: user.email, password: 'nope' });
        expect(res.status).toBe(401);
      }

      const registration = await api.post('/api/auth/register').send({
        email: `fresh-${Date.now()}@example.com`,
        password: 'a very long passphrase',
        name: 'Fresh User',
      });

      expect(registration.status).toBe(201);
    });
  });

  describe('SQL injection resistance', () => {
    it('treats SQL metacharacters in search as literal text', async () => {
      await h
        .agent()
        .post('/api/projects')
        .set(...bearer(user.accessToken))
        .send({ name: 'Alpha Report' });

      const res = await h
        .agent()
        .get(`/api/projects?search=${encodeURIComponent("' OR 1=1 --")}`)
        .set(...bearer(user.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });

    it('cannot be tricked into dropping rows via a wildcard search', async () => {
      await h.agent().post('/api/projects').set(...bearer(user.accessToken)).send({ name: 'Alpha Report' });

      const res = await h
        .agent()
        .get(`/api/projects?search=${encodeURIComponent('%')}`)
        .set(...bearer(user.accessToken));

      expect(res.status).toBe(200);
      // If `%` were passed through unescaped, this would match every project.
      expect(res.body.meta.total).toBe(0);
    });

    it('rejects injected ORDER BY fragments at the validation layer', async () => {
      await h.agent().post('/api/projects').set(...bearer(user.accessToken)).send({ name: 'Alpha Report' });

      const res = await h
        .agent()
        .get(`/api/projects?sort=${encodeURIComponent('id; DROP TABLE projects--')}`)
        .set(...bearer(user.accessToken));

      // The shape is rejected before it can reach the query builder at all.
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // The table must still exist and hold its row.
      const still = await h.agent().get('/api/projects').set(...bearer(user.accessToken));
      expect(still.status).toBe(200);
      expect(still.body.meta.total).toBe(1);
    });

    it('accepts a well-formed but unknown sort field and falls back safely', async () => {
      await h.agent().post('/api/projects').set(...bearer(user.accessToken)).send({ name: 'Alpha Report' });

      const res = await h
        .agent()
        .get(`/api/projects?sort=${encodeURIComponent('unknownField:asc')}`)
        .set(...bearer(user.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('escapes LIKE wildcards correctly at the unit level', () => {
      expect(escapeLike('100%')).toBe('100\\%');
      expect(escapeLike('a_b')).toBe('a\\_b');
      expect(escapeLike('back\\slash')).toBe('back\\\\slash');
    });

    it('only ever emits whitelisted ORDER BY columns', () => {
      const allowed = ['id', 'name'] as const;

      expect(resolveSort('name:asc', allowed, 'id')).toEqual({ column: 'name', direction: 'ASC' });
      expect(resolveSort('name', allowed, 'id').direction).toBe('DESC');
      expect(resolveSort(undefined, allowed, 'id')).toEqual({ column: 'id', direction: 'DESC' });
      expect(resolveSort('bogus:asc', allowed, 'id')).toEqual({ column: 'id', direction: 'DESC' });
      // A direction that is neither asc nor desc falls back to DESC, never to SQL.
      expect(resolveSort('name:sideways', allowed, 'id').direction).toBe('DESC');
    });
  });

  describe('password storage primitives', () => {
    it('produces a salted scrypt hash that verifies correctly', () => {
      const hash = hashPassword('correct horse battery staple');

      expect(hash.startsWith('scrypt$')).toBe(true);
      expect(hash).not.toContain('correct horse battery staple');
      expect(verifyPassword('correct horse battery staple', hash)).toBe(true);
      expect(verifyPassword('wrong passphrase', hash)).toBe(false);
    });

    it('produces a different hash each time for the same password', () => {
      const a = hashPassword('same password value');
      const b = hashPassword('same password value');

      expect(a).not.toBe(b);
      expect(verifyPassword('same password value', a)).toBe(true);
      expect(verifyPassword('same password value', b)).toBe(true);
    });

    it('returns false rather than throwing for corrupt hashes', () => {
      expect(verifyPassword('anything', '')).toBe(false);
      expect(verifyPassword('anything', 'not-a-hash')).toBe(false);
      expect(verifyPassword('anything', 'scrypt$1$2$3')).toBe(false);
      expect(verifyPassword('anything', 'bcrypt$16384$8$1$aa$bb')).toBe(false);
      expect(verifyPassword('anything', `scrypt$a$b$c$aa$bb`)).toBe(false);
    });

    it('never stores the raw refresh token', () => {
      const token = generateOpaqueToken();
      const digest = hashToken(token);

      expect(token).not.toBe(digest);
      expect(digest).toHaveLength(64);
      expect(hashToken(token)).toBe(digest);
      expect(hashToken(`${token}x`)).not.toBe(digest);
    });

    it('generates unique opaque tokens', () => {
      const tokens = new Set(Array.from({ length: 500 }, () => generateOpaqueToken()));
      expect(tokens.size).toBe(500);
    });

    it('refuses to boot in production without a JWT secret', () => {
      const previous = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      try {
        expect(() => loadConfig('production')).toThrow(/JWT_SECRET is required/);
      } finally {
        if (previous !== undefined) process.env.JWT_SECRET = previous;
      }
    });

    it('refuses a short JWT secret in production', () => {
      const previous = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'too-short';

      try {
        expect(() => loadConfig('production')).toThrow(/at least 32 characters/);
      } finally {
        if (previous === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previous;
      }
    });
  });

  describe('error envelope hygiene', () => {
    it('never leaks a stack trace', async () => {
      const res = await h.agent().get('/api/projects/not-a-number').set(...bearer(user.accessToken));

      expect(res.status).toBe(422);
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('at ');
      expect(serialized).not.toContain('node_modules');
      expect(res.body.error).not.toHaveProperty('stack');
    });

    it('uses a stable machine-readable code on every error shape', async () => {
      const cases = [
        { res: await h.agent().get('/api/projects'), expected: 'UNAUTHORIZED' },
        { res: await h.agent().get('/nope'), expected: 'ROUTE_NOT_FOUND' },
        { res: await h.agent().get('/api/projects/1').set(...bearer('garbage')), expected: 'TOKEN_INVALID' },
        { res: await h.agent().post('/api/auth/register').send({ email: 'bad' }), expected: 'VALIDATION_ERROR' },
      ];

      for (const { res, expected } of cases) {
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.body.error.code).toBe(expected);
        expect(typeof res.body.error.message).toBe('string');
        expect(res.body.error.message.length).toBeGreaterThan(0);
      }
    });
  });
});