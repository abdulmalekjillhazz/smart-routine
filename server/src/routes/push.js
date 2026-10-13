import { Router } from 'express';
import { pushSubscribeSchema, pushUnsubscribeSchema } from '@smart-routine/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { AppError, MSG } from '../lib/AppError.js';
import { PushSubscription } from '../models/PushSubscription.js';

const MINUTE = 60 * 1000;
const unavailable = () => new AppError(503, 'UNAVAILABLE', MSG.unavailable);

export function pushRouter(config) {
  const r = Router();

  // The public key is not secret. The browser needs it to subscribe. No login required.
  r.get('/public-key', (_req, res, next) => {
    if (!config.VAPID_PUBLIC_KEY) return next(unavailable());
    res.json({ publicKey: config.VAPID_PUBLIC_KEY });
  });

  r.use(requireAuth);

  r.post(
    '/subscriptions',
    rateLimit({ name: 'push-subscribe', limit: 10, windowMs: MINUTE, by: 'user' }),
    validate({ body: pushSubscribeSchema }),
    async (req, res, next) => {
      try {
        if (!config.VAPID_PUBLIC_KEY) throw unavailable();
        const { endpoint, keys } = req.body;
        await PushSubscription.findOneAndUpdate(
          { endpoint },
          { $set: { userId: req.userId, keys, failureCount: 0 } },
          { upsert: true }
        );
        res.status(201).json({ ok: true });
      } catch (err) {
        next(err);
      }
    }
  );

  r.delete(
    '/subscriptions',
    validate({ body: pushUnsubscribeSchema }),
    async (req, res, next) => {
      try {
        await PushSubscription.deleteOne({ endpoint: req.body.endpoint, userId: req.userId });
        res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    }
  );

  return r;
}
