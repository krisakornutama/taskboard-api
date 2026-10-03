import type { PageMeta } from '../types.js';

/** Upper bound on page size, so a client cannot request the whole table. */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export interface PaginationInput {
  page: number;
  pageSize: number;
}

/**
 * Only ever interpolates integers into SQL, never raw request strings, so this
 * is injection-safe by construction.
 */
export function paginationSql(input: PaginationInput): { limit: number; offset: number } {
  const limit = input.pageSize;
  return { limit, offset: (input.page - 1) * limit };
}

export function buildMeta(input: PaginationInput, total: number): PageMeta {
  return {
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: input.pageSize > 0 ? Math.ceil(total / input.pageSize) : 0,
  };
}

/**
 * Whitelist mapping for ORDER BY. Request values are never concatenated into SQL
 * without going through this lookup.
 *
 * An unrecognised column discards the *whole* input, including the requested
 * direction: `sort=bogus:asc` falls back to `(fallback, defaultDirection)`
 * rather than silently sorting by the fallback column ascending, which would be
 * surprising to a caller.
 */
export function resolveSort<T extends string>(
  requested: string | undefined,
  allowed: readonly T[],
  fallback: T,
  defaultDirection: 'ASC' | 'DESC' = 'DESC',
): { column: T; direction: 'ASC' | 'DESC' } {
  const raw = (requested ?? '').trim().toLowerCase();
  const [maybeColumn, maybeDirection] = raw.split(':');
  const column = allowed.find((candidate) => candidate === maybeColumn);

  if (column === undefined) {
    return { column: fallback, direction: defaultDirection };
  }

  const direction: 'ASC' | 'DESC' =
    maybeDirection === 'asc' ? 'ASC' : maybeDirection === 'desc' ? 'DESC' : defaultDirection;

  return { column, direction };
}