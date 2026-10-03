import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { signAccessToken } from '../src/lib/jwt.js';
import { bearer, createTestApp, registerUser, type TestHarness, type TestUser } from './helpers.js';

describe('authentication & token lifecycle', () => {
  let h: TestHarness;
  let user: TestUser;

  beforeAll(() => {
    h = createTestApp();
  });

  afterAll(() => {
    h.close();
  });

  beforeEach(async () => {
    h.resetDatabase();
    h.resetRateLimits();
    user = await registerUser(h.agent());
  });

  describe('POST /api/auth/register', () => {
    it('creates an account and returns a usable token pair', async () => {
      const api = h.agent();

      const res = await api.post('/api/auth/register').send({
        email: 'New.User+Tag@Example.com',
        password: 'a very long passphrase',
        name: 'New User',
      });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('new.user+tag@example.com'); // normalised
      expect(res.body.user.role).toBe('member');
      expect(res.body.user.name).toBe('New User');
      expect(typeof res.body.user.id).toBe('number');
      expect(res.body.tokens.accessToken).toEqual(expect.any(String));
      expect(res.body.tokens.refreshToken).toEqual(expect.any(String));
      expect(res.body.tokens.expiresIn).toBe('15m');

      // The new access token must actually work.
      const me = await api.get('/api/auth/me').set(...bearer(res.body.tokens.accessToken));
      expect(me.status).toBe(200);
    });

    it('never leaks the password hash', async () => {
      const res = await h.agent().post('/api/auth/register').send({
        email: `leak-${Date.now()}@example.com`,
        password: 'a very long passphrase',
        name: 'Leak Check',
      });

      expect(res.status).toBe(201);
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('password');
      expect(serialized).not.toContain('scrypt$');
    });

    it('rejects a duplicate email with 409', async () => {
      const res = await h.agent().post('/api/auth/register').send({
        email: user.email,
        password: 'another long passphrase',
        name: 'Impostor',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('treats email uniqueness as case-insensitive', async () => {
      const res = await h.agent().post('/api/auth/register').send({
        email: user.email.toUpperCase(),
        password: 'another long passphrase',
        name: 'Impostor',
      });

      expect(res.status).toBe(409);
    });

    it('rejects malformed email, short password and short name with 422', async () => {
      const res = await h.agent().post('/api/auth/register').send({
        email: 'not-an-email',
        password: 'short',
        name: 'A',
      });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const paths = res.body.error.details.issues.map((i: { path: string }) => i.path);
      expect(paths).toEqual(expect.arrayContaining(['email', 'password', 'name']));
    });

    it('ignores unexpected extra fields instead of trusting them', async () => {
      const res = await h.agent().post('/api/auth/register').send({
        email: `sneaky-${Date.now()}@example.com`,
        password: 'a very long passphrase',
        name: 'Sneaky User',
        role: 'admin', // privilege escalation attempt
        id: 9999,
      });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('member');
      expect(res.body.user.id).not.toBe(9999);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns a new token pair for correct credentials', async () => {
      const res = await h.agent().post('/api/auth/login').send({
        email: user.email,
        password: 'correct horse battery staple',
      });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(user.email);
      expect(res.body.tokens.accessToken).toEqual(expect.any(String));
    });

    it('rejects a wrong password with a generic 401', async () => {
      const res = await h.agent().post('/api/auth/login').send({
        email: user.email,
        password: 'definitely not the passphrase',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns an identical error for unknown accounts (no user enumeration)', async () => {
      const unknown = await h.agent().post('/api/auth/login').send({
        email: 'nobody-here@example.com',
        password: 'whatever value here',
      });

      const wrongPassword = await h.agent().post('/api/auth/login').send({
        email: user.email,
        password: 'definitely not the passphrase',
      });

      expect(unknown.status).toBe(wrongPassword.status);
      expect(unknown.body.error.code).toBe(wrongPassword.body.error.code);
      expect(unknown.body.error.message).toBe(wrongPassword.body.error.message);
    });

    it('rejects an empty password body with 422, not 401', async () => {
      const res = await h.agent().post('/api/auth/login').send({ email: user.email, password: '' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('rotates the refresh token', async () => {
      const res = await h.agent().post('/api/auth/refresh').send({ refreshToken: user.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.tokens.refreshToken).not.toBe(user.refreshToken);
      expect(res.body.tokens.accessToken).toEqual(expect.any(String));
    });

    it('detects replay of a rotated token and revokes every session', async () => {
      const api = h.agent();
      const first = await api.post('/api/auth/refresh').send({ refreshToken: user.refreshToken });
      expect(first.status).toBe(200);
      const rotatedToken = first.body.tokens.refreshToken;

      // Replaying the original token must fail...
      const replay = await api.post('/api/auth/refresh').send({ refreshToken: user.refreshToken });
      expect(replay.status).toBe(401);
      expect(replay.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // ...and the legitimate rotated token must be revoked as a precaution.
      const afterBreach = await api.post('/api/auth/refresh').send({ refreshToken: rotatedToken });
      expect(afterBreach.status).toBe(401);
    });

    it('rejects an unknown refresh token', async () => {
      const res = await h.agent().post('/api/auth/refresh').send({ refreshToken: 'not-a-real-token' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_INVALID');
    });

    it('rejects an expired refresh token', async () => {
      h.db.prepare("UPDATE refresh_tokens SET expires_at = '2000-01-01T00:00:00.000Z'").run();

      const res = await h.agent().post('/api/auth/refresh').send({ refreshToken: user.refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('requires the refreshToken field', async () => {
      const res = await h.agent().post('/api/auth/refresh').send({});

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/logout & logout-all', () => {
    it('revokes the supplied refresh token', async () => {
      const api = h.agent();

      const logout = await api
        .post('/api/auth/logout')
        .set(...bearer(user.accessToken))
        .send({ refreshToken: user.refreshToken });
      expect(logout.status).toBe(204);

      const res = await api.post('/api/auth/refresh').send({ refreshToken: user.refreshToken });
      expect(res.status).toBe(401);
    });

    it('revokes all sessions with logout-all', async () => {
      const api = h.agent();

      const first = await api.post('/api/auth/login').send({
        email: user.email,
        password: 'correct horse battery staple',
      });

      const res = await api.post('/api/auth/logout-all').set(...bearer(user.accessToken));
      expect(res.status).toBe(204);

      const after = await api.post('/api/auth/refresh').send({
        refreshToken: first.body.tokens.refreshToken,
      });
      expect(after.status).toBe(401);
    });

    it('requires authentication to log out', async () => {
      const res = await h.agent().post('/api/auth/logout').send({ refreshToken: user.refreshToken });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the authenticated profile', async () => {
      const res = await h.agent().get('/api/auth/me').set(...bearer(user.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(user.email);
      expect(res.body.data.id).toBe(user.id);
    });

    it('rejects a missing header', async () => {
      const res = await h.agent().get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toBe('Bearer');
    });

    it('rejects a garbage token', async () => {
      const res = await h.agent().get('/api/auth/me').set(...bearer('abc.def.ghi'));

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_INVALID');
    });

    it('rejects a non-bearer scheme', async () => {
      const res = await h.agent().get('/api/auth/me').set('Authorization', `Basic ${user.accessToken}`);

      expect(res.status).toBe(401);
    });

    it('rejects a token signed with a different secret', async () => {
      const forged = signAccessToken(
        { id: user.id, email: user.email, role: 'admin' },
        'a-different-secret-entirely-0123456789',
        '15m',
      );

      const res = await h.agent().get('/api/auth/me').set(...bearer(forged));

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_INVALID');
    });

    it('rejects an expired access token', async () => {
      const expired = signAccessToken(
        { id: user.id, email: user.email, role: 'member' },
        h.config.jwt.secret,
        '-1s',
      );

      const res = await h.agent().get('/api/auth/me').set(...bearer(expired));

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('rejects a refresh token presented as an access token', async () => {
      const res = await h.agent().get('/api/auth/me').set(...bearer(user.refreshToken));

      expect(res.status).toBe(401);
    });
  });
});