import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  TIERS,
  EXTRAS,
  buildOrder,
  createOrder,
  slugify,
  orderId,
  detectScopeDrift,
  deliveryStatus,
} from '../tools/order.mjs';

describe('slugify and orderId', () => {
  it('turns a client name into a safe path segment', () => {
    expect(slugify('ACME Corp')).toBe('acme-corp');
    expect(slugify('  Bob & Sons  Ltd ')).toBe('bob-sons-ltd');
    expect(slugify('สดใจ')).toBe('');
    expect(slugify('a/b\\c')).toBe('a-b-c');
  });

  it('builds a dated id', () => {
    expect(orderId('2026-10-04', 'ACME Corp')).toBe('2026-10-04-acme-corp');
  });
});

describe('buildOrder', () => {
  it('uses the tier price and default delivery window', () => {
    const o = buildOrder({ client: 'ACME', tier: 'standard', date: '2026-10-04T00:00:00.000Z' });

    expect(o.basePrice).toBe(399);
    expect(o.total).toBe(399);
    expect(o.dueAt.slice(0, 10)).toBe('2026-10-09');
    expect(o.revisionsAllowed).toBe(2);
  });

  it('honours an explicit delivery window', () => {
    const o = buildOrder({ client: 'X', tier: 'basic', days: 10, date: '2026-10-04T00:00:00.000Z' });
    expect(o.dueAt.slice(0, 10)).toBe('2026-10-14');
  });

  it('adds extras to both the money and the schedule', () => {
    const o = buildOrder({
      client: 'X',
      tier: 'basic',
      extras: ['file upload', 'offline sync'],
      date: '2026-10-04T00:00:00.000Z',
    });

    expect(o.extraTotal).toBe(85 + 150);
    expect(o.total).toBe(149 + 235);
    expect(o.dueAt.slice(0, 10)).toBe('2026-10-07');       // 3 base days
    expect(o.dueAtWithExtras.slice(0, 10)).toBe('2026-10-11'); // 3 + 1 + 3
  });

  it('rejects an unknown tier instead of guessing', () => {
    expect(() => buildOrder({ client: 'X', tier: 'platinum' })).toThrow(/Unknown tier/);
  });

  it('defines all three tiers with a price and a window', () => {
    for (const [name, spec] of Object.entries(TIERS)) {
      expect(spec.price, name).toBeGreaterThan(0);
      expect(spec.defaultDays, name).toBeGreaterThan(0);
      expect(spec.included.length, name).toBeGreaterThan(0);
      expect(spec.excluded.length, name).toBeGreaterThan(0);
    }
  });

  it('keeps the tiers strictly ascending in price', () => {
    expect(TIERS.basic.price).toBeLessThan(TIERS.standard.price);
    expect(TIERS.standard.price).toBeLessThan(TIERS.premium.price);
  });

  it('prices every extra and keeps every price positive', () => {
    for (const [name, ex] of Object.entries(EXTRAS)) {
      expect(ex.price, name).toBeGreaterThan(0);
      expect(ex.days, name).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('createOrder', () => {
  it('writes every file the workflow needs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'order-'));
    try {
      const { order, dir: created } = createOrder({
        client: 'ACME',
        tier: 'standard',
        date: '2026-10-04T00:00:00.000Z',
      });

      expect(existsSync(created)).toBe(true);
      for (const file of ['ORDER.md', 'intake.md', 'scope.md', 'checklist.md', 'messages.md', 'RESULT.md']) {
        expect(existsSync(join(created, file)), file).toBe(true);
      }

      const scope = readFileSync(join(created, 'scope.md'), 'utf8');
      expect(scope).toContain('Up to 3 resources');
      expect(scope).toContain(`$${String(order.basePrice)}`);
      expect(scope).toContain('Deviation log');

      const checklist = readFileSync(join(created, 'checklist.md'), 'utf8');
      expect(checklist).toContain('npm run typecheck');
      expect(checklist).toContain('npm test');
      expect(checklist).not.toMatch(/^\s*- \[ \]\s*$/m); // no blank checkbox lines
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('detectScopeDrift', () => {
  const basic = buildOrder({ client: 'X', tier: 'basic' });

  it('returns nothing for an empty request', () => {
    expect(detectScopeDrift('', basic)).toEqual([]);
  });

  it('flags a new resource request', () => {
    const flags = detectScopeDrift('Could you add a new resource for invoices?', basic);
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.some((f) => f.item.includes('resource') || f.item.includes('Resource'))).toBe(true);
  });

  it('matches a known extra and quotes it', () => {
    const flags = detectScopeDrift('I also need file upload please', basic);
    const extra = flags.find((f) => f.kind === 'available-extra');
    expect(extra).toBeDefined();
    expect(extra?.quote).toBe(`$${EXTRAS['file upload']?.price}`);
  });

  it('flags frontend, payments, email, deployment and maintenance', () => {
    for (const ask of [
      'can you build an admin panel too',
      'we need stripe payments',
      'send an email when it happens',
      'please deploy it to aws',
      'we want ongoing support',
    ]) {
      const flags = detectScopeDrift(ask, basic);
      expect(flags.some((f) => f.kind === 'out-of-scope'), ask).toBe(true);
    }
  });

  it('flags a discount request with the right advice', () => {
    const flags = detectScopeDrift('any chance of a lower price?', basic);
    const pricing = flags.find((f) => f.kind === 'pricing');
    expect(pricing).toBeDefined();
    expect(pricing?.quote).toMatch(/scope/);
  });

  it('does not invent flags for ordinary in-scope wording', () => {
    const flags = detectScopeDrift('please add pagination and filtering to the tasks list', basic);
    expect(flags.filter((f) => f.kind === 'out-of-scope')).toHaveLength(0);
  });
});

describe('deliveryStatus', () => {
  const order = buildOrder({ client: 'X', tier: 'standard', days: 5, date: '2026-10-04T00:00:00.000Z' });

  it('counts down before the due date', () => {
    const s = deliveryStatus(order, new Date('2026-10-06T00:00:00.000Z'));
    expect(s.overdue).toBe(false);
    expect(s.daysLeft).toBe(3);
  });

  it('reports overdue after the due date', () => {
    const s = deliveryStatus(order, new Date('2026-10-12T00:00:00.000Z'));
    expect(s.overdue).toBe(true);
    expect(s.daysLeft).toBeLessThan(0);
  });

  it('tracks revisions remaining', () => {
    const s = deliveryStatus({ ...order, revisionsUsed: 1, revisionsAllowed: 2 }, new Date('2026-10-05'));
    expect(s.revisionsLeft).toBe(1);
  });
});