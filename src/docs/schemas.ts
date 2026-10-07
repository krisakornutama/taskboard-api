/**
 * OpenAPI Documentation Generator - Schema Registry
 *
 * Central registry of all Zod schemas used in the project for OpenAPI generation.
 * This file imports the actual Zod schemas from the source modules.
 */

import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS (from src/modules/auth/auth.schema.ts)
// ============================================================================

export const emailSchema = z
  .email('A valid email address is required.')
  .max(254, 'Email address is too long.')
  .transform((value) => value.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long.')
  .max(200, 'Password must be at most 200 characters long.')
  .refine((value) => !value.trim().startsWith('TaskBoard!'), {
    message: 'Password must not start with the product name.',
  });

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long.')
    .max(80, 'Name must be at most 80 characters long.'),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(200),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required.').max(500),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// PROJECT SCHEMAS (from src/modules/projects/project.schema.ts)
// ============================================================================

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

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  status: projectStatusSchema.optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  sort: z
    .enum(['name', 'createdAt', 'updatedAt', 'id'])
    .optional()
    .describe('Field to sort by. Append ":asc" or ":desc" (default desc).'),
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
  sort: z.enum(['title', 'dueDate', 'createdAt', 'updatedAt', 'id']).optional(),
})

// ============================================================================
// TYPE EXPORTS (for OpenAPI generator)
// ============================================================================

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;