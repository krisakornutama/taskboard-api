import { z } from 'zod';

import { paginationQuerySchema } from '../auth/auth.schema.js';

export const projectStatusSchema = z.enum(['active', 'archived']);

export const createProjectBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Project name must be at least 2 characters long.')
    .max(120, 'Project name must be at most 120 characters long.'),
  description: z.string().trim().max(2000, 'Description must be at most 2000 characters long.').default(''),
  status: projectStatusSchema.default('active'),
});

export const updateProjectBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).optional(),
    status: projectStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

/**
 * Sort accepts the shape `field` or `field:asc|field:desc`. Only the *shape* is
 * validated here — the field name itself is checked against a whitelist in
 * `resolveSort` right before it reaches SQL.
 */
const sortShapeSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z][A-Za-z0-9_]{0,30}(?::(asc|desc))?$/,
    'sort must look like "field" or "field:asc" / "field:desc".',
  );

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  status: projectStatusSchema.optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  sort: sortShapeSchema.optional(),
});

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done']);
export const taskPrioritySchema = z.enum(['low', 'medium', 'high']);

export const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'dueDate must be a valid ISO 8601 date.' })
  .transform((value) => new Date(value).toISOString());

export const createTaskBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Task title must be at least 2 characters long.')
    .max(200, 'Task title must be at most 200 characters long.'),
  description: z.string().trim().max(4000, 'Description must be at most 4000 characters long.').default(''),
  status: taskStatusSchema.default('todo'),
  priority: taskPrioritySchema.default('medium'),
  assigneeId: z.coerce.number().int().positive().nullable().optional(),
  dueDate: isoDateSchema.nullable().optional(),
});

export const updateTaskBodySchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(4000).optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    assigneeId: z.coerce.number().int().positive().nullable().optional(),
    dueDate: isoDateSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listTasksQuerySchema = paginationQuerySchema.extend({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sort: sortShapeSchema.optional(),
});

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;