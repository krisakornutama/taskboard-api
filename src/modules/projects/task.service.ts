import { HttpError } from '../../lib/http-error.js';
import { buildMeta, paginationSql, resolveSort } from '../../lib/pagination.js';
import type { Ctx, Paginated, Task, TaskRow } from '../../types.js';
import type { CreateTaskBody, ListTasksQuery, UpdateTaskBody } from './project.schema.js';

const SORT_COLUMNS = {
  title: 'title',
  dueDate: 'due_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  id: 'id',
} as const;

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    createdBy: row.created_by,
    assigneeId: row.assignee_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function findTaskRow(ctx: Ctx, id: number): TaskRow | undefined {
  return ctx.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as unknown as TaskRow | undefined;
}

/** Resolves a task and verifies the caller may act on it via its parent project. */
export function loadAccessibleTask(ctx: Ctx, id: number, viewer: { userId: number; role: string }): Task {
  const row = findTaskRow(ctx, id);
  if (!row) throw HttpError.notFound(`Task ${id} does not exist.`);

  const project = ctx.db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(row.project_id) as
    | { owner_id: number }
    | undefined;

  // A task whose project vanished cannot happen (cascade), but treat it as gone.
  if (!project) throw HttpError.notFound(`Task ${id} does not exist.`);

  if (project.owner_id !== viewer.userId && viewer.role !== 'admin') {
    throw HttpError.notFound(`Task ${id} does not exist.`);
  }
  return toTask(row);
}

function assertAssigneeExists(ctx: Ctx, assigneeId: number | null | undefined): void {
  if (assigneeId === null || assigneeId === undefined) return;
  const row = ctx.db.prepare('SELECT id FROM users WHERE id = ?').get(assigneeId);
  if (!row) throw HttpError.validation('assigneeId does not reference an existing user.', {
    issues: [{ source: 'body', path: 'assigneeId', message: 'Unknown user.', code: 'invalid_reference' }],
  });
}

export function createTask(ctx: Ctx, projectId: number, createdBy: number, body: CreateTaskBody): Task {
  assertAssigneeExists(ctx, body.assigneeId);

  const result = ctx.db
    .prepare(
      `INSERT INTO tasks (project_id, created_by, assignee_id, title, description, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      projectId,
      createdBy,
      body.assigneeId ?? null,
      body.title,
      body.description,
      body.status,
      body.priority,
      body.dueDate ?? null,
    );

  const row = ctx.db.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(result.lastInsertRowid)) as unknown as TaskRow;
  return toTask(row);
}

export function updateTask(ctx: Ctx, id: number, body: UpdateTaskBody): Task {
  assertAssigneeExists(ctx, body.assigneeId);

  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (body.title !== undefined) {
    sets.push('title = ?');
    values.push(body.title);
  }
  if (body.description !== undefined) {
    sets.push('description = ?');
    values.push(body.description);
  }
  if (body.status !== undefined) {
    sets.push('status = ?');
    values.push(body.status);
  }
  if (body.priority !== undefined) {
    sets.push('priority = ?');
    values.push(body.priority);
  }
  if (body.assigneeId !== undefined) {
    sets.push('assignee_id = ?');
    values.push(body.assigneeId);
  }
  if (body.dueDate !== undefined) {
    sets.push('due_date = ?');
    values.push(body.dueDate);
  }

  sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  values.push(id);

  ctx.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  const row = findTaskRow(ctx, id);
  if (!row) throw HttpError.notFound(`Task ${id} does not exist.`);
  return toTask(row);
}

export function deleteTask(ctx: Ctx, id: number): void {
  const result = ctx.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  if (result.changes === 0) throw HttpError.notFound(`Task ${id} does not exist.`);
}

export function listTasksForProject(
  ctx: Ctx,
  projectId: number,
  query: ListTasksQuery,
): Paginated<Task> {
  const where: string[] = ['project_id = ?'];
  const values: (string | number)[] = [projectId];

  if (query.status !== undefined) {
    where.push('status = ?');
    values.push(query.status);
  }
  if (query.priority !== undefined) {
    where.push('priority = ?');
    values.push(query.priority);
  }
  if (query.assigneeId !== undefined) {
    where.push('assignee_id = ?');
    values.push(query.assigneeId);
  }
  if (query.search !== undefined) {
    where.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    const pattern = `%${escapeLike(query.search)}%`;
    values.push(pattern, pattern);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const sort = resolveSort(query.sort, Object.keys(SORT_COLUMNS) as (keyof typeof SORT_COLUMNS)[], 'createdAt');
  // Tasks with no due date sort last regardless of direction.
  const orderSql =
    sort.column === 'dueDate'
      ? `ORDER BY (due_date IS NULL) ASC, due_date ${sort.direction}, id DESC`
      : `ORDER BY ${SORT_COLUMNS[sort.column]} ${sort.direction}, id DESC`;

  const totalRow = ctx.db.prepare(`SELECT COUNT(*) AS total FROM tasks ${whereSql}`).get(...values) as {
    total: number;
  };

  const { limit, offset } = paginationSql(query);
  const rows = ctx.db
    .prepare(`SELECT * FROM tasks ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
    .all(...values, limit, offset) as unknown as TaskRow[];

  return { data: rows.map(toTask), meta: buildMeta(query, totalRow.total) };
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}