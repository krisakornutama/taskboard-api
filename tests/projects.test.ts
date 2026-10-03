import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, createTestApp, promoteToAdmin, registerUser, type TestHarness, type TestUser } from './helpers.js';

describe('projects CRUD, pagination & access control', () => {
  let h: TestHarness;
  let owner: TestUser;
  let intruder: TestUser;

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
    intruder = await registerUser(h.agent(), { name: 'Intruder' });
  });

  async function createProject(user: TestUser, name = 'Website Redesign'): Promise<any> {
    const res = await h.agent().post('/api/projects').set(...bearer(user.accessToken)).send({ name });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  describe('POST /api/projects', () => {
    it('creates a project owned by the caller with sane defaults', async () => {
      const res = await h.agent()
        .post('/api/projects')
        .set(...bearer(owner.accessToken))
        .send({ name: 'Website Redesign' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: 'Website Redesign',
        description: '',
        status: 'active',
        ownerId: owner.id,
      });
      expect(typeof res.body.data.id).toBe('number');
      expect(new Date(res.body.data.createdAt).toString()).not.toBe('Invalid Date');
    });

    it('rejects a name shorter than 2 characters', async () => {
      const res = await h.agent().post('/api/projects').set(...bearer(owner.accessToken)).send({ name: 'a' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an unknown status value', async () => {
      const res = await h.agent()
        .post('/api/projects')
        .set(...bearer(owner.accessToken))
        .send({ name: 'Valid Name', status: 'not-a-status' });

      expect(res.status).toBe(422);
    });

    it('requires authentication', async () => {
      const res = await h.agent().post('/api/projects').send({ name: 'Anonymous Project' });

      expect(res.status).toBe(401);
    });

    it('cannot be used to set the owner to another user', async () => {
      const res = await h.agent()
        .post('/api/projects')
        .set(...bearer(intruder.accessToken))
        .send({ name: 'Stolen Project', ownerId: owner.id });

      expect(res.status).toBe(201);
      expect(res.body.data.ownerId).toBe(intruder.id);
    });
  });

  describe('GET /api/projects', () => {
    it('only lists projects owned by the caller', async () => {
      await createProject(owner, 'Owner Project');
      await createProject(intruder, 'Intruder Project');

      const res = await h.agent().get('/api/projects').set(...bearer(owner.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Owner Project');
      expect(res.body.meta.total).toBe(1);
    });

    it('paginates with correct metadata', async () => {
      for (let i = 1; i <= 7; i += 1) {
        await createProject(owner, `Project ${String(i).padStart(2, '0')}`);
      }

      const page1 = await h.agent().get('/api/projects?page=1&pageSize=3').set(...bearer(owner.accessToken));

      expect(page1.status).toBe(200);
      expect(page1.body.data).toHaveLength(3);
      expect(page1.body.meta).toEqual({ page: 1, pageSize: 3, total: 7, totalPages: 3 });

      const page3 = await h.agent().get('/api/projects?page=3&pageSize=3').set(...bearer(owner.accessToken));
      expect(page3.body.data).toHaveLength(1);
      expect(page3.body.meta.page).toBe(3);

      const beyond = await h.agent().get('/api/projects?page=99&pageSize=3').set(...bearer(owner.accessToken));
      expect(beyond.status).toBe(200);
      expect(beyond.body.data).toHaveLength(0);
      expect(beyond.body.meta.total).toBe(7);
    });

    it('rejects a pageSize above the 100 cap and a page below 1', async () => {
      const tooBig = await h.agent().get('/api/projects?pageSize=101').set(...bearer(owner.accessToken));
      expect(tooBig.status).toBe(422);

      const zeroPage = await h.agent().get('/api/projects?page=0').set(...bearer(owner.accessToken));
      expect(zeroPage.status).toBe(422);
    });

    it('coerces numeric strings in the query string', async () => {
      await createProject(owner);

      const res = await h.agent().get('/api/projects?page=1&pageSize=20').set(...bearer(owner.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.pageSize).toBe(20);
    });

    it('filters by status', async () => {
      await createProject(owner, 'Active One');
      const archived = await createProject(owner, 'Archived One');
      await h.agent().patch(`/api/projects/${archived.id}`).set(...bearer(owner.accessToken)).send({ status: 'archived' });

      const res = await h.agent().get('/api/projects?status=archived').set(...bearer(owner.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Archived One');
    });

    it('searches name and description', async () => {
      await h.agent().post('/api/projects').set(...bearer(owner.accessToken)).send({
        name: 'Marketing Campaign',
        description: 'Q3 launch plan',
      });
      await createProject(owner, 'Internal Tooling');

      const byName = await h.agent().get('/api/projects?search=Marketing').set(...bearer(owner.accessToken));
      expect(byName.body.data).toHaveLength(1);

      const byDescription = await h.agent().get('/api/projects?search=launch').set(...bearer(owner.accessToken));
      expect(byDescription.body.data).toHaveLength(1);

      const noMatch = await h.agent().get('/api/projects?search=zzzz').set(...bearer(owner.accessToken));
      expect(noMatch.body.data).toHaveLength(0);
    });

    it('sorts ascending and descending', async () => {
      await createProject(owner, 'Alpha');
      await createProject(owner, 'Bravo');
      await createProject(owner, 'Charlie');

      const asc = await h.agent().get('/api/projects?sort=name:asc').set(...bearer(owner.accessToken));
      expect(asc.body.data.map((p: any) => p.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);

      const desc = await h.agent().get('/api/projects?sort=name:desc').set(...bearer(owner.accessToken));
      expect(desc.body.data.map((p: any) => p.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });

    it('falls back to a safe default for an unknown sort field', async () => {
      await createProject(owner);

      const res = await h.agent().get('/api/projects?sort=notAColumn:asc').set(...bearer(owner.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('returns the project for its owner', async () => {
      const project = await createProject(owner);

      const res = await h.agent().get(`/api/projects/${project.id}`).set(...bearer(owner.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(project.id);
    });

    it('hides another user’s project behind 404 rather than 403', async () => {
      const project = await createProject(owner);

      const res = await h.agent().get(`/api/projects/${project.id}`).set(...bearer(intruder.accessToken));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 for a project that does not exist', async () => {
      const res = await h.agent().get('/api/projects/999999').set(...bearer(owner.accessToken));

      expect(res.status).toBe(404);
    });

    it('returns 422 for a non-numeric id', async () => {
      const res = await h.agent().get('/api/projects/not-a-number').set(...bearer(owner.accessToken));

      expect(res.status).toBe(422);
    });

    it('rejects a negative or zero id', async () => {
      const res = await h.agent().get('/api/projects/-4').set(...bearer(owner.accessToken));

      expect(res.status).toBe(422);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('updates only the supplied fields', async () => {
      const project = await createProject(owner);

      const res = await h
        .agent()
        .patch(`/api/projects/${project.id}`)
        .set(...bearer(owner.accessToken))
        .send({ name: 'Renamed Project' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed Project');
      expect(res.body.data.description).toBe('');
    });

    it('moves updatedAt forward', async () => {
      const project = await createProject(owner);

      const res = await h
        .agent()
        .patch(`/api/projects/${project.id}`)
        .set(...bearer(owner.accessToken))
        .send({ description: 'now documented' });

      expect(res.status).toBe(200);
      expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(project.createdAt).getTime(),
      );
    });

    it('rejects an empty patch body', async () => {
      const project = await createProject(owner);

      const res = await h.agent().patch(`/api/projects/${project.id}`).set(...bearer(owner.accessToken)).send({});

      expect(res.status).toBe(422);
    });

    it('forbids updating another user’s project', async () => {
      const project = await createProject(owner);

      const res = await h
        .agent()
        .patch(`/api/projects/${project.id}`)
        .set(...bearer(intruder.accessToken))
        .send({ name: 'Hijacked' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('deletes the project and then returns 404', async () => {
      const project = await createProject(owner);

      const deleted = await h.agent().delete(`/api/projects/${project.id}`).set(...bearer(owner.accessToken));
      expect(deleted.status).toBe(204);

      const res = await h.agent().get(`/api/projects/${project.id}`).set(...bearer(owner.accessToken));
      expect(res.status).toBe(404);
    });

    it('returns 404 when deleting a project owned by someone else', async () => {
      const project = await createProject(owner);

      const res = await h.agent().delete(`/api/projects/${project.id}`).set(...bearer(intruder.accessToken));

      expect(res.status).toBe(404);

      // And the project must still exist.
      const check = await h.agent().get(`/api/projects/${project.id}`).set(...bearer(owner.accessToken));
      expect(check.status).toBe(200);
    });
  });

  describe('role-based access', () => {
    it('lets an admin read any user’s project', async () => {
      const project = await createProject(owner);
      promoteToAdmin(h.db, intruder.id);

      const res = await h.agent().get(`/api/projects/${project.id}`).set(...bearer(intruder.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(project.id);
    });

    it('lets an admin list every user’s projects', async () => {
      await createProject(owner, 'Owner Project');
      await createProject(intruder, 'Intruder Project');
      promoteToAdmin(h.db, intruder.id);

      const res = await h.agent().get('/api/projects').set(...bearer(intruder.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(2);
    });

    it('does not grant a member access to anything extra', async () => {
      const project = await createProject(owner);

      const res = await h.agent().get('/api/projects?ownerId=1').set(...bearer(intruder.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(0);
      expect(res.status).not.toBe(403);
      expect(project.ownerId).toBe(owner.id);
    });
  });
});