import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

import { HttpError } from '../lib/http-error.js';

export interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Validates and *replaces* request segments with their parsed output, so handlers
 * receive coerced, correctly typed values rather than raw strings.
 *
 * Express 5 exposes `req.query` as a getter-only property, so parsed query output
 * is stashed on `res.locals.query` instead of being reassigned.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const issues: { source: string; path: string; message: string; code: string }[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) {
        req.body = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({
            source: 'body',
            path: issue.path.join('.') || '(root)',
            message: issue.message,
            code: issue.code,
          });
        }
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) {
        // `req.params` is a plain own property on the request in Express 5 and is
        // safe to overwrite.
        Object.assign(req.params, result.data);
      } else {
        for (const issue of result.error.issues) {
          issues.push({
            source: 'params',
            path: issue.path.join('.') || '(root)',
            message: issue.message,
            code: issue.code,
          });
        }
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) {
        res.locals.query = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({
            source: 'query',
            path: issue.path.join('.') || '(root)',
            message: issue.message,
            code: issue.code,
          });
        }
      }
    }

    if (issues.length > 0) {
      next(
        HttpError.validation('The request did not pass validation.', {
          issues,
        }),
      );
      return;
    }

    next();
  };
}

/** Typed accessor for the output of `validate({ query })`. */
export function validatedQuery<T>(res: Response): T {
  return res.locals.query as T;
}