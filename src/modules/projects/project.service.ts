import { HttpError } from '../../lib/http-error.js';
import { buildMeta, paginationSql, resolveSort } from '../../lib/pagination.js';
import type { Ctx, Paginated, Project, ProjectRow, ProjectStatus, UserRow } from '../../types.js';
import type { CreateProjectBody, ListProjectsQuery, UpdateProjectBody } from './project.schema.js';

/** Column whitelist: request values never reach SQL without passing through this. */
const SORT_COLUMNS = {
  name: 'name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  id: 'id',
} as const;

export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function findProjectRow(ctx: Ctx, id: number): ProjectRow | undefined {
  return ctx.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as ProjectRow | undefined;
}

/**
 * Loads a project and enforces access control in one step.
 *
 * Members see only projects they own; admins see everything. Returns 404 rather
 * than 403 for a project the caller cannot see, so the API does not leak the
 * existence of other tenants' resources.
 */
export function loadAccessibleProject(ctx: Ctx, id: number, userId: number, role: string): Project {
  const row = findProjectRow(ctx, id);
  if (!row) throw HttpError.notFound(`Project ${id} does not exist.`);

  if (row.owner_id !== userId && role !== 'admin') {
    throw HttpError.notFound(`Project ${id} does not exist.`);
  }
  return toProject(row);
}

export function createProject(ctx: Ctx, ownerId: number, body: CreateProjectBody): Project {
  const result = ctx.db
    .prepare('INSERT INTO projects (owner_id, name, description, status) VALUES (?, ?, ?, ?)')
    .run(ownerId, body.name, body.description, body.status);

  const row = ctx.db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as unknown as ProjectRow;
  return toProject(row);
}

export function updateProject(ctx: Ctx, id: number, body: UpdateProjectBody): Project {
  const sets: string[] = [];
  const values: (string | number)[] = [];

  if (body.name !== undefined) {
    sets.push('name = ?');
    values.push(body.name);
  }
  if (body.description !== undefined) {
    sets.push('description = ?');
    values.push(body.description);
  }
  if (body.status !== undefined) {
    sets.push('status = ?');
    values.push(body.status);
  }

  sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  values.push(id);

  ctx.db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  const row = findProjectRow(ctx, id);
  if (!row) throw HttpError.notFound(`Project ${id} does not exist.`);
  return toProject(row);
}

/** Cascades to the project's tasks via the `ON DELETE CASCADE` foreign key. */
export function deleteProject(ctx: Ctx, id: number): void {
  const result = ctx.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  if (result.changes === 0) throw HttpError.notFound(`Project ${id} does not exist.`);
}

export function listProjects(
  ctx: Ctx,
  query: ListProjectsQuery,
  viewer: { userId: number; role: string },
): Paginated<Project> {
  const where: string[] = [];
  const values: (string | number)[] = [];

  // Members are hard-scoped to their own rows.
  if (viewer.role !== 'admin') {
    where.push('owner_id = ?');
    values.push(viewer.userId);
  } else if (query.ownerId !== undefined) {
    where.push('owner_id = ?');
    values.push(query.ownerId);
  }

  if (query.status !== undefined) {
    where.push('status = ?');
    values.push(query.status);
  }

  if (query.search !== undefined) {
    where.push('(name LIKE ? ESCAPE \'\\\' OR description LIKE ? ESCAPE \'\\\')');
    const pattern = `%${escapeLike(query.search)}%`;
    values.push(pattern, pattern);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const sort = resolveSort(query.sort, Object.keys(SORT_COLUMNS) as (keyof typeof SORT_COLUMNS)[], 'createdAt');
  const orderSql = `ORDER BY ${SORT_COLUMNS[sort.column]} ${sort.direction}, id DESC`;

  const totalRow = ctx.db
    .prepare(`SELECT COUNT(*) AS total FROM projects ${whereSql}`)
    .get(...values) as { total: number };

  const { limit, offset } = paginationSql(query);
  const rows = ctx.db
    .prepare(`SELECT * FROM projects ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
    .all(...values, limit, offset) as unknown as ProjectRow[];

  return {
    data: rows.map(toProject),
    meta: buildMeta(query, totalRow.total),
  };
}

export function ownerExists(ctx: Ctx, userId: number): boolean {
  const row = ctx.db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as UserRow | undefined;
  return Boolean(row);
}

/** Escapes LIKE wildcards so a search for "100%" is not treated as a wildcard. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export type { ProjectStatus };