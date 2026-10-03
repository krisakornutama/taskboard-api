import { HttpError } from '../../lib/http-error.js';
import { signAccessToken } from '../../lib/jwt.js';
import { generateOpaqueToken, hashPassword, hashToken, verifyPassword } from '../../lib/password.js';
import type { Ctx, PublicUser, UserRow } from '../../types.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  };
}

function findUserByEmail(ctx: Ctx, email: string): UserRow | undefined {
  return ctx.db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) as unknown as
    | UserRow
    | undefined;
}

export function findUserById(ctx: Ctx, id: number): PublicUser | undefined {
  const row = ctx.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRow | undefined;
  return row ? toPublicUser(row) : undefined;
}

function issueTokens(ctx: Ctx, user: UserRow): TokenPair {
  const accessToken = signAccessToken(
    { id: user.id, email: user.email, role: user.role },
    ctx.config.jwt.secret,
    ctx.config.jwt.accessTtl,
  );

  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + ctx.config.jwt.refreshTtlDays * 86_400_000).toISOString();

  ctx.db
    .prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(user.id, hashToken(refreshToken), expiresAt);

  return { accessToken, refreshToken, expiresIn: ctx.config.jwt.accessTtl };
}

export function register(ctx: Ctx, input: { email: string; password: string; name: string }): AuthResult {
  if (findUserByEmail(ctx, input.email)) {
    throw HttpError.conflict('An account with that email address already exists.');
  }

  const result = ctx.db
    .prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
    .run(input.email, hashPassword(input.password), input.name, 'member');

  const user = ctx.db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as unknown as UserRow;

  return { user: toPublicUser(user), tokens: issueTokens(ctx, user) };
}

export function login(ctx: Ctx, input: { email: string; password: string }): AuthResult {
  const user = findUserByEmail(ctx, input.email);

  // Always run a hash comparison, even when the account does not exist, so the
  // response time does not reveal which emails are registered.
  const stored = user?.password_hash ?? DUMMY_HASH;
  const passwordOk = verifyPassword(input.password, stored);

  if (!user || !passwordOk) {
    throw HttpError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  return { user: toPublicUser(user), tokens: issueTokens(ctx, user) };
}

/**
 * Exchanges a refresh token for a new pair, rotating the old token. Presenting a
 * token that was already used is treated as a replay attempt: every session for
 * that user is revoked.
 */
export function refresh(ctx: Ctx, refreshToken: string): AuthResult {
  const tokenHash = hashToken(refreshToken);
  const row = ctx.db
    .prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?')
    .get(tokenHash) as unknown as
    | { id: number; user_id: number; expires_at: string; revoked_at: string | null }
    | undefined;

  if (!row) {
    throw HttpError.unauthorized('Refresh token is invalid.', 'TOKEN_INVALID');
  }

  if (row.revoked_at !== null) {
    // Reuse of a rotated token: assume compromise and cut every session.
    ctx.db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ?').run(
      new Date().toISOString(),
      row.user_id,
    );
    throw HttpError.unauthorized(
      'Refresh token has already been used. All sessions were revoked.',
      'TOKEN_REUSE_DETECTED',
    );
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    throw HttpError.unauthorized('Refresh token has expired.', 'TOKEN_EXPIRED');
  }

  const user = ctx.db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) as unknown as
    | UserRow
    | undefined;

  if (!user) {
    throw HttpError.unauthorized('Refresh token is invalid.', 'TOKEN_INVALID');
  }

  ctx.db
    .prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?")
    .run(new Date().toISOString(), row.id);

  return { user: toPublicUser(user), tokens: issueTokens(ctx, user) };
}

export function logout(ctx: Ctx, userId: number, refreshToken: string): void {
  ctx.db
    .prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND token_hash = ?')
    .run(new Date().toISOString(), userId, hashToken(refreshToken));
}

export function logoutAll(ctx: Ctx, userId: number): void {
  ctx.db
    .prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
    .run(new Date().toISOString(), userId);
}

/**
 * A valid scrypt hash of a random string, used to equalise the cost of a login
 * attempt against a non-existent account.
 */
const DUMMY_HASH =
  'scrypt$16384$8$1$00000000000000000000000000000000$' +
  '0000000000000000000000000000000000000000000000000000000000000000' +
  '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Creates the bootstrap admin when configured and the users table is empty.
 * Safe to call on every boot.
 */
export function seedAdmin(ctx: Ctx): void {
  const { email, password, name } = ctx.config.seedAdmin;
  if (!email || !password) return;

  const existing = ctx.db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
  if (existing.count > 0) return;

  ctx.db
    .prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
    .run(email.toLowerCase(), hashPassword(password), name, 'admin');

  console.log(`[seed] Created bootstrap admin ${email}`);
}