import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, type TestHarness } from './helpers.js';

describe('service health & transport envelope', () => {
  let h: TestHarness;

  beforeAll(() => {
    h = createTestApp();
  });

  afterAll(() => {
    h.close();
  });

  beforeEach(() => {
    h.resetDatabase();
    h.resetRateLimits();
  });

  it('reports healthy and proves the database is reachable', async () => {
    const res = await h.agent().get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.environment).toBe('test');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('exposes a health check under /api as well', async () => {
    const res = await h.agent().get('/api/health');
    expect(res.status).toBe(200);
  });

  it('returns a structured 404 for unknown routes', async () => {
    const res = await h.agent().get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(res.body.error.message).toContain('GET');
  });

  it('sets baseline security headers and hides the framework', async () => {
    const res = await h.agent().get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('returns 400 (not 500) for malformed JSON', async () => {
    const res = await h.agent()
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken",,}');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('rejects bodies over the 100kb limit', async () => {
    const res = await h.agent()
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(200_000), name: 'Big' }));

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});