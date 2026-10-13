import { Router } from 'express';
import { profileUpdateSchema, consentSchema, passwordOnlySchema } from '@smart-routine/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { User } from '../models/User.js';
import { toPublicUser } from '../services/dto.js';
import { requirePassword, exportAccount, deleteAccount } from '../services/account.js';
import { clearSessionCookies } from '../lib/cookies.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function meRouter(config) {
  const r = Router();
  r.use(requireAuth);

  r.get('/', (req, res) => {
    res.json({ user: toPublicUser(req.user) });
  });

  r.patch(
    '/',
    rateLimit({ name: 'profile', limit: 30, windowMs: MINUTE, by: 'user' }),
    validate({ body: profileUpdateSchema }),
    async (req, res, next) => {
      try {
        const updated = await User.findByIdAndUpdate(req.userId, { $set: req.body }, { new: true, runValidators: true }).lean();
        res.json({ user: toPublicUser(updated) });
      } catch (err) {
        next(err);
      }
    }
  );

  r.put(
    '/consents/model-training',
    rateLimit({ name: 'consent', limit: 10, windowMs: MINUTE, by: 'user' }),
    validate({ body: consentSchema }),
    async (req, res, next) => {
      try {
        const consent = { granted: req.body.granted, version: req.body.version, updatedAt: new Date() };
        await User.updateOne({ _id: req.userId }, { $set: { 'consents.modelTraining': consent } });
        res.json({ consent });
      } catch (err) {
        next(err);
      }
    }
  );

  // Password is checked before the export. The rate limit counts wrong guesses too.
  r.post(
    '/export',
    rateLimit({ name: 'export', limit: 3, windowMs: DAY, by: 'user' }),
    validate({ body: passwordOnlySchema }),
    async (req, res, next) => {
      try {
        await requirePassword(req.userId, req.body.password);
        const data = await exportAccount(req.user);
        res.setHeader('Content-Disposition', 'attachment; filename="smart-routine-export.json"');
        res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  r.delete(
    '/',
    rateLimit({ name: 'delete', limit: 2, windowMs: DAY, by: 'user' }),
    validate({ body: passwordOnlySchema }),
    async (req, res, next) => {
      try {
        await requirePassword(req.userId, req.body.password);
        await deleteAccount(req.userId);
        clearSessionCookies(res, config);
        res.json({ ok: true, purgeAfterDays: 30 });
      } catch (err) {
        next(err);
      }
    }
  );

  return r;
}
