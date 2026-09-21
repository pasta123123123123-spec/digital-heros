import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError, ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Every controller defines its schema as z.object({ body?, params?, query? })
 * — e.g. `z.object({ body: z.object({ email: z.string().email() }) })`.
 * That outer call returns a ZodObject whose shape (the { body, params,
 * query } we actually want) lives at `.shape`, NOT as direct properties on
 * the object itself — `schema.body` is always undefined; `schema.shape.body`
 * is the real inner schema. Reading `.shape` here is what makes this work.
 *
 * The inner `body`/`params`/`query` schemas are typed as ZodTypeAny rather
 * than AnyZodObject because a schema using `.refine()` (for cross-field
 * checks) returns a ZodEffects wrapper, not a plain ZodObject — ZodTypeAny
 * is the common base both share and is all `.parse()` needs.
 */
export function validate(schema: AnyZodObject) {
  const { body, params, query } = schema.shape as {
    body?: ZodTypeAny;
    params?: ZodTypeAny;
    query?: ZodTypeAny;
  };

  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (body) req.body = body.parse(req.body);
      if (params) req.params = params.parse(req.params) as typeof req.params;
      if (query) req.query = query.parse(req.query) as typeof req.query;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(AppError.badRequest('Validation failed', err.flatten().fieldErrors));
      }
      next(err);
    }
  };
}
