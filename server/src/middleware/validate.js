import { AppError, MSG } from '../lib/AppError.js';

function fieldErrors(zodError) {
  return zodError.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}

// Parses body and query with a shared Zod schema. Replaces req.body with the cleaned value.
export function validate({ body, query } = {}) {
  return (req, _res, next) => {
    if (body) {
      const r = body.safeParse(req.body ?? {});
      if (!r.success) return next(new AppError(400, 'VALIDATION_FAILED', MSG.invalid, fieldErrors(r.error)));
      req.body = r.data;
    }
    if (query) {
      const r = query.safeParse(req.query ?? {});
      if (!r.success) return next(new AppError(400, 'VALIDATION_FAILED', MSG.invalid, fieldErrors(r.error)));
      req.query = r.data;
    }
    next();
  };
}
