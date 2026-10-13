import { Router } from 'express';
import { completionSchema, todayInZone } from '@smart-routine/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { AppError, MSG } from '../lib/AppError.js';
import { Routine } from '../models/Routine.js';
import { Completion } from '../models/Completion.js';

const MINUTE = 60 * 1000;

export function completionsRouter() {
  const r = Router();
  r.use(requireAuth);
  r.use(rateLimit({ name: 'completions', limit: 120, windowMs: MINUTE, by: 'user' }));

  // PUT is idempotent: sending the same status twice leaves one row.
  r.put('/', validate({ body: completionSchema }), async (req, res, next) => {
    try {
      const { routineId, date, status } = req.body;

      // "Today" is judged in the user's timezone, not the server's.
      if (date > todayInZone(req.user.timezone)) {
        throw new AppError(400, 'VALIDATION_FAILED', MSG.futureDate, [{ path: 'date', message: 'future date' }]);
      }

      const owned = await Routine.exists({ _id: routineId, userId: req.userId });
      if (!owned) throw new AppError(404, 'NOT_FOUND', MSG.notFound);

      await Completion.findOneAndUpdate(
        { userId: req.userId, routineId, date },
        { $set: { status } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      res.json({ completion: { routineId, date, status } });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
