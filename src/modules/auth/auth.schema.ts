import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../lib/pagination.js';

/**
 * Password policy. Length is the dominant factor in resistance to offline
 * cracking, so the minimum is 12 characters rather than a complex mix of
 * character classes that only push users toward predictable substitutions.
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long.')
  .max(200, 'Password must be at most 200 characters long.')
  .refine((value) => !value.trim().startsWith('TaskBoard!'), {
    message: 'Password must not start with the product name.',
  });

export const emailSchema = z
  .email('A valid email address is required.')
  .max(254, 'Email address is too long.')
  .transform((value) => value.trim().toLowerCase());

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
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;