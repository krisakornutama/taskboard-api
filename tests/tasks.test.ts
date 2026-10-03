import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, createTestApp, registerUser, type TestHarness, type TestUser } from './helpers.js';

describe('tasks CRUD, filters & cascade behaviour', () => {
  let h: TestHarness;
  let owner: TestUser;
  let teammate: TestUser;
  let projectId: number;

  beforeAll(() => {
    h = createTestApp();
  });

  afterAll(() => {
    h.close();
  });

  beforeEach(async () => {
    h.resetDatabase();
    h.resetRateLimits();
    owner = await registerUser(h.agent(), { name: 'Owner' });
    teammate = await registerUser(h.agent(), { name: 'Teammate' });

    const project = await h
      .agent()
      .post('/api/projects')
      .set(...bearer(owner.accessToken))
      .send({ name: 'Launch Plan' });
    projectId = project.body.data.id;
  });

  async function createTask(overrides: Record<string, unknown> = {}, token = owner.accessToken): Promise<any> {
    const res = await h
      .agent()
      .post(`/api/projects/${projectId}/tasks`)
      .set(...bearer(token))
      .send({ title: 'Write documentation', ...overrides });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  describe('POST /api/projects/:id/tasks', () => {
    it('creates a task with defaults', async () => {
      const res = await h
        .agent()
        .post(`/api/projects/${projectId}/tasks`)
        .set(...bearer(owner.accessToken))
        .send({ title: 'Write documentation' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        title: 'Write documentation',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        assigneeId: null,
        createdBy: owner.id,
        projectId,
      });
    });

    it('accepts every optional field', async () => {
      const task = await createTask({
        description: 'Cover the auth flow',
        status: 'in_progress',
        priority: 'high',
        assigneeId: teammate.id,
        dueDate: '2026-12-31',
      });

      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.assigneeId).toBe(teammate.id);
      expect(task.dueDate).toBe('2026-12-31T00:00:00.000Z');
    });

    it('normalises a date-only due date to ISO 8601', async () => {
      const task = await createTask({ dueDate: '2026-07-04' });

      expect(task.dueDate).toBe('2026-07-04T00:00:00.000Z');
    });

    it('rejects an unparseable due date', async () => {
      const res = await h
        .agent()
        .post(`/api/projects/${projectId}/tasks`)
        .set(...bearer(owner.accessToken))
        .send({ title: 'Bad date', dueDate: 'next tuesday-ish' });

      expect(res.status).toBe(422);
    });

    it('rejects an assigneeId that references no user', async () => {
      const res = await h
        .agent()
        .post(`/api/projects/${projectId}/tasks`)
        .set(...bearer(owner.accessToken))
        .send({ title: 'Ghost assignee', assigneeId: 999999 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a title that is too short', async () => {
      const res = await h
        .agent()
        .post(`/api/projects/${projectId}/tasks`)
        .set(...bearer(owner.accessToken))
        .send({ title: 'x' });

      expect(res.status).toBe(422);
    });

    it('returns 404 when creating a task under a project you cannot see', async () => {
      const res = await h
        .agent()
        .post(`/api/projects/${projectId}/tasks`)
        .set(...bearer(teammate.accessToken))
        .send({ title: 'Should not exist' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/projects/:id/tasks', () => {
    it('lists tasks for the project with pagination metadata', async () => {
      await createTask({ title: 'Task A' });
      await createTask({ title: 'Task B' });

      const res = await h
        .agent()
        .get(`/api/projects/${projectId}/tasks`)
        .set(...bearer(owner.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
    });

    it('filters by status', async () => {
      await createTask({ title: 'Todo item' });
      await createTask({ title: 'Done item', status: 'done' });

      const res = await h
        .agent()
        .get(`/api/projects/${projectId}/tasks?status=done`)
        .set(...bearer(owner.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Done item');
    });

    it('filters by priority and by assignee', async () => {
      await createTask({ title: 'Urgent', priority: 'high' });
      await createTask({ title: 'Assigned', assigneeId: teammate.id });

      const byPriority = await h
        .agent()
        .get(`/api/projects/${projectId}/tasks?priority=high`)
        .set(...bearer(owner.accessToken));
      expect(byPriority.body.data).toHaveLength(1);

      const byAssignee = await h
        .agent()
        .get(`/api/projects/${projectId}/tasks?assigneeId=${teammate.id}`)
        .set(...bearer(owner.accessToken));
      expect(byAssignee.body.data).toHaveLength(1);
    });

    it('combines filters', async () => {
      await createTask({ title: 'High todo', priority: 'high' });
      await createTask({ title: 'High done', priority: 'high', status: 'done' });
      await createTask({ title: 'Low done', priority: 'low', status: 'done' });

      const res = await h
        .agent()
        .get(`/api/projects/${projectId}/tasks?priority=high&status=done`)
        .set(...bearer(owner.accessToken));

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('High done');
    });

    it('sorts by due date with undated tasks last', async () => {
      await createTask({ title: 'No date' });
      await createTask({ title: 'Later', dueDate: '2026-12-01' });
      await createTask({ title: 'Sooner', dueDate: '2026-01-01' });

      const res = await h
        .agent()
        .get(`/api/projects/${projectId}/tasks?sort=dueDate:asc`)
        .set(...bearer(owner.accessToken));

      expect(res.body.data.map((t: any) => t.title)).toEqual(['Sooner', 'Later', 'No date']);
    });

    it('searches titles', async () => {
      await createTask({ title: 'Refactor the parser' });
      await createTask({ title: 'Update the changelog' });

      const res = await h
        .agent()
        .get(`/api/projects/${projectId}/tasks?search=parser`)
        .set(...bearer(owner.accessToken));

      expect(res.body.data).toHaveLength(1);
    });

    it('does not leak tasks from another project', async () => {
      await createTask({ title: 'Mine' });
      const other = await h
        .agent()
        .post('/api/projects')
        .set(...bearer(owner.accessToken))
        .send({ name: 'Other Project' });
      const otherId = other.body.data.id;

      const created = await h
        .agent()
        .post(`/api/projects/${otherId}/tasks`)
        .set(...bearer(owner.accessToken))
        .send({ title: 'Theirs' });
      expect(created.status).toBe(201);

      const res = await h
        .agent()
        .get(`/api/projects/${otherId}/tasks`)
        .set(...bearer(owner.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].title).toBe('Theirs');

      // The original project must still only contain its own task.
      const original = await h
        .agent()
        .get(`/api/projects/${projectId}/tasks`)
        .set(...bearer(owner.accessToken));
      expect(original.body.meta.total).toBe(1);
      expect(original.body.data[0].title).toBe('Mine');
    });
  });

  describe('GET/PATCH/DELETE /api/tasks/:id', () => {
    it('reads, updates and deletes a task', async () => {
      const task = await createTask({ title: 'Original title' });

      const read = await h.agent().get(`/api/tasks/${task.id}`).set(...bearer(owner.accessToken));
      expect(read.status).toBe(200);
      expect(read.body.data.title).toBe('Original title');

      const patched = await h
        .agent()
        .patch(`/api/tasks/${task.id}`)
        .set(...bearer(owner.accessToken))
        .send({ status: 'in_progress', priority: 'high' });
      expect(patched.status).toBe(200);
      expect(patched.body.data.status).toBe('in_progress');
      expect(patched.body.data.priority).toBe('high');

      const deleted = await h.agent().delete(`/api/tasks/${task.id}`).set(...bearer(owner.accessToken));
      expect(deleted.status).toBe(204);

      const gone = await h.agent().get(`/api/tasks/${task.id}`).set(...bearer(owner.accessToken));
      expect(gone.status).toBe(404);
    });

    it('can clear the assignee and the due date with explicit null', async () => {
      const task = await createTask({ assigneeId: teammate.id, dueDate: '2026-10-01' });

      const res = await h
        .agent()
        .patch(`/api/tasks/${task.id}`)
        .set(...bearer(owner.accessToken))
        .send({ assigneeId: null, dueDate: null });

      expect(res.status).toBe(200);
      expect(res.body.data.assigneeId).toBeNull();
      expect(res.body.data.dueDate).toBeNull();
    });

    it('hides a task from a user who does not own the project', async () => {
      const task = await createTask({ title: 'Private work' });

      const read = await h.agent().get(`/api/tasks/${task.id}`).set(...bearer(teammate.accessToken));
      expect(read.status).toBe(404);

      const patch = await h
        .agent()
        .patch(`/api/tasks/${task.id}`)
        .set(...bearer(teammate.accessToken))
        .send({ title: 'Hijacked title' });
      expect(patch.status).toBe(404);

      const remove = await h.agent().delete(`/api/tasks/${task.id}`).set(...bearer(teammate.accessToken));
      expect(remove.status).toBe(404);
    });

    it('rejects an empty patch body', async () => {
      const task = await createTask();

      const res = await h.agent().patch(`/api/tasks/${task.id}`).set(...bearer(owner.accessToken)).send({});

      expect(res.status).toBe(422);
    });
  });

  describe('referential integrity', () => {
    it('deletes a project’s tasks when the project is deleted', async () => {
      await createTask({ title: 'Doomed A' });
      await createTask({ title: 'Doomed B' });

      const before = h.db.prepare('SELECT COUNT(*) AS c FROM tasks').get() as { c: number };
      expect(before.c).toBe(2);

      const deleted = await h.agent().delete(`/api/projects/${projectId}`).set(...bearer(owner.accessToken));
      expect(deleted.status).toBe(204);

      const after = h.db.prepare('SELECT COUNT(*) AS c FROM tasks').get() as { c: number };
      expect(after.c).toBe(0);
    });

    it('deletes a user’s projects and tasks when the user is removed', async () => {
      await createTask({ title: 'Will be cascaded' });

      h.db.prepare('DELETE FROM users WHERE id = ?').run(owner.id);

      const projects = h.db.prepare('SELECT COUNT(*) AS c FROM projects').get() as { c: number };
      const tasks = h.db.prepare('SELECT COUNT(*) AS c FROM tasks').get() as { c: number };
      expect(projects.c).toBe(0);
      expect(tasks.c).toBe(0);
    });

    it('unassigns rather than deletes tasks when the assignee is removed', async () => {
      await createTask({ assigneeId: teammate.id });

      h.db.prepare('DELETE FROM users WHERE id = ?').run(teammate.id);

      const row = h.db.prepare('SELECT assignee_id FROM tasks').get() as { assignee_id: number | null };
      expect(row.assignee_id).toBeNull();
    });

    it('removes a deleted user’s refresh tokens', async () => {
      const tokens = h.db.prepare('SELECT COUNT(*) AS c FROM refresh_tokens WHERE user_id = ?').get(owner.id) as {
        c: number;
      };
      expect(tokens.c).toBeGreaterThan(0);

      h.db.prepare('DELETE FROM users WHERE id = ?').run(owner.id);

      const after = h.db.prepare('SELECT COUNT(*) AS c FROM refresh_tokens WHERE user_id = ?').get(owner.id) as {
        c: number;
      };
      expect(after.c).toBe(0);
    });
  });
});