import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import { validate, validatedQuery } from '../../middleware/validate.js';
import type { Ctx } from '../../types.js';
import { idParamSchema, type IdParam } from '../auth/auth.schema.js';
import {
  createProjectBodySchema,
  createTaskBodySchema,
  listProjectsQuerySchema,
  listTasksQuerySchema,
  updateProjectBodySchema,
  updateTaskBodySchema,
  type CreateProjectBody,
  type CreateTaskBody,
  type ListProjectsQuery,
  type ListTasksQuery,
  type UpdateProjectBody,
  type UpdateTaskBody,
} from './project.schema.js';
import {
  createProject,
  deleteProject,
  listProjects,
  loadAccessibleProject,
  updateProject,
} from './project.service.js';
import {
  createTask,
  deleteTask,
  listTasksForProject,
  loadAccessibleTask,
  updateTask,
} from './task.service.js';

export function projectRoutes(ctx: Ctx): Router {
  const router = Router();
  router.use(requireAuth(ctx));

  // --- Projects -------------------------------------------------------------

  router.get('/projects', validate({ query: listProjectsQuerySchema }), (req, res) => {
    const query = validatedQuery<ListProjectsQuery>(res);
    res.json(listProjects(ctx, query, { userId: req.auth!.userId, role: req.auth!.role }));
  });

  router.post('/projects', validate({ body: createProjectBodySchema }), (req, res) => {
    const body = req.body as CreateProjectBody;
    res.status(201).json({ data: createProject(ctx, req.auth!.userId, body) });
  });

  router.get('/projects/:id', validate({ params: idParamSchema }), (req, res) => {
    const { id } = req.params as unknown as IdParam;
    const project = loadAccessibleProject(ctx, id, req.auth!.userId, req.auth!.role);
    res.json({ data: project });
  });

  router.patch('/projects/:id', validate({ params: idParamSchema, body: updateProjectBodySchema }), (req, res) => {
    const { id } = req.params as unknown as IdParam;
    loadAccessibleProject(ctx, id, req.auth!.userId, req.auth!.role);
    res.json({ data: updateProject(ctx, id, req.body as UpdateProjectBody) });
  });

  router.delete('/projects/:id', validate({ params: idParamSchema }), (req, res) => {
    const { id } = req.params as unknown as IdParam;
    loadAccessibleProject(ctx, id, req.auth!.userId, req.auth!.role);
    deleteProject(ctx, id);
    res.status(204).send();
  });

  // --- Tasks ----------------------------------------------------------------

  router.get(
    '/projects/:id/tasks',
    validate({ params: idParamSchema, query: listTasksQuerySchema }),
    (req, res) => {
      const { id } = req.params as unknown as IdParam;
      loadAccessibleProject(ctx, id, req.auth!.userId, req.auth!.role);
      res.json(listTasksForProject(ctx, id, validatedQuery<ListTasksQuery>(res)));
    },
  );

  router.post(
    '/projects/:id/tasks',
    validate({ params: idParamSchema, body: createTaskBodySchema }),
    (req, res) => {
      const { id } = req.params as unknown as IdParam;
      loadAccessibleProject(ctx, id, req.auth!.userId, req.auth!.role);
      const created = createTask(ctx, id, req.auth!.userId, req.body as CreateTaskBody);
      res.status(201).json({ data: created });
    },
  );

  router.get('/tasks/:id', validate({ params: idParamSchema }), (req, res) => {
    const { id } = req.params as unknown as IdParam;
    res.json({ data: loadAccessibleTask(ctx, id, { userId: req.auth!.userId, role: req.auth!.role }) });
  });

  router.patch('/tasks/:id', validate({ params: idParamSchema, body: updateTaskBodySchema }), (req, res) => {
    const { id } = req.params as unknown as IdParam;
    loadAccessibleTask(ctx, id, { userId: req.auth!.userId, role: req.auth!.role });
    res.json({ data: updateTask(ctx, id, req.body as UpdateTaskBody) });
  });

  router.delete('/tasks/:id', validate({ params: idParamSchema }), (req, res) => {
    const { id } = req.params as unknown as IdParam;
    loadAccessibleTask(ctx, id, { userId: req.auth!.userId, role: req.auth!.role });
    deleteTask(ctx, id);
    res.status(204).send();
  });

  return router;
}