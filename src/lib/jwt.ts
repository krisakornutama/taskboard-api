import jwt from 'jsonwebtoken';

import type { Role } from '../types.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  /** Distinguishes access tokens from refresh tokens sharing the same secret. */
  typ: 'access';
}

export function signAccessToken(
  input: { id: number; email: string; role: Role },
  secret: string,
  ttl: string,
): string {
  const payload: AccessTokenPayload = {
    sub: String(input.id),
    email: input.email,
    role: input.role,
    typ: 'access',
  };
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: ttl,
    issuer: 'taskboard-api',
    audience: 'taskboard-client',
  } as jwt.SignOptions);
}

export type VerifyResult =
  | { ok: true; payload: AccessTokenPayload }
  | { ok: false; reason: 'expired' | 'invalid' };

export function verifyAccessToken(token: string, secret: string): VerifyResult {
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'taskboard-api',
      audience: 'taskboard-client',
    });

    if (typeof decoded === 'string') return { ok: false, reason: 'invalid' };

    const { sub, email, role, typ } = decoded as Partial<AccessTokenPayload>;
    if (typeof sub !== 'string' || typeof email !== 'string' || typ !== 'access') {
      return { ok: false, reason: 'invalid' };
    }
    if (role !== 'member' && role !== 'admin') return { ok: false, reason: 'invalid' };

    return { ok: true, payload: { sub, email, role, typ } };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'invalid' };
  }
}