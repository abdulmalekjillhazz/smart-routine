import { Router } from 'express';
import { syncBodySchema } from '@smart-routine/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { applySyncOps } from '../services/sync.js';

const MINUTE = 60 * 1000;

export function syncRouter() {
  const r = Router();
  r.use(requireAuth);
  r.use(rateLimit({ name: 'sync', limit: 60, windowMs: MINUTE, by: 'user' }));

  // One batch of up to 100 operations. Each result has the same opId as its operation.
  r.post('/', validate({ body: syncBodySchema }), async (req, res, next) => {
    try {
      const results = await applySyncOps(req.user, req.body.ops);
      res.json({ results });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
