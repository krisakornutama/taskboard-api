import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

/**
 * Password hashing built on `node:crypto`'s scrypt — no native module to compile,
 * so `npm install` cannot fail on a customer's machine.
 *
 * Stored format: `scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>`
 * Parameters are embedded in the hash so they can be upgraded later without
 * invalidating existing credentials.
 */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

const SCRYPT_PREFIX = 'scrypt';

function deriveKey(password: string, salt: Buffer, n: number, r: number, p: number): Buffer {
  return scryptSync(password.normalize('NFKC'), salt, KEY_LENGTH, { N: n, r, p, maxmem: 64 * 1024 * 1024 });
}

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = deriveKey(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return [SCRYPT_PREFIX, SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('hex'), hash.toString('hex')].join('$');
}

/**
 * Verifies a password against a stored hash in constant time.
 * Returns false (rather than throwing) for malformed or truncated hashes so that
 * a corrupt row cannot become a 500 on the login path.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6) return false;

  const [prefix, nRaw, rRaw, pRaw, saltHex, hashHex] = parts;
  if (prefix !== SCRYPT_PREFIX) return false;

  const n = Number.parseInt(nRaw ?? '', 10);
  const r = Number.parseInt(rRaw ?? '', 10);
  const p = Number.parseInt(pRaw ?? '', 10);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const salt = Buffer.from(saltHex ?? '', 'hex');
  const expected = Buffer.from(hashHex ?? '', 'hex');
  if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;

  const actual = deriveKey(password, salt, n, r, p);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Opaque high-entropy token for refresh tokens. 256 bits of randomness, URL-safe.
 * Only the SHA-256 digest is persisted, so a database leak cannot be replayed.
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}