import { Router } from 'express';
import { FLAG_DEFAULTS } from '@smart-routine/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { effectiveFlags, isEnabledFor } from '../services/flags.js';

// Signed-in users see whether each feature is on for them. The browser uses this to hide features.
export function flagsRouter() {
  const r = Router();
  r.get('/', requireAuth, async (req, res, next) => {
    try {
      const all = await effectiveFlags();
      const mine = {};
      for (const key of Object.keys(FLAG_DEFAULTS)) {
        mine[key] = await isEnabledFor(key, req.userId);
      }
      res.json({ flags: mine, rollouts: Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.rolloutPercent])) });
    } catch (err) {
      next(err);
    }
  });
  return r;
}
