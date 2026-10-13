import { Router } from 'express';
import mongoose from 'mongoose';
import { lessonAttemptSchema } from '@smart-routine/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { AppError, MSG } from '../lib/AppError.js';
import { listPublished, findPublishedBySlug, toPublicLesson, submitAttempt } from '../services/lessons.js';
import { isEnabledFor } from '../services/flags.js';

const MINUTE = 60 * 1000;

export function lessonsRouter() {
  const r = Router();

  // Public: published lessons only. No answer keys, no author or status fields.
  r.get('/', rateLimit({ name: 'lessons-list', limit: 120, windowMs: MINUTE }), async (_req, res, next) => {
    try {
      res.json({ lessons: await listPublished() });
    } catch (err) {
      next(err);
    }
  });

  r.get('/:slug', rateLimit({ name: 'lessons-read', limit: 120, windowMs: MINUTE }), async (req, res, next) => {
    try {
      const lesson = await findPublishedBySlug(req.params.slug);
      res.json({ lesson: toPublicLesson(lesson) });
    } catch (err) {
      next(err);
    }
  });

  // Signed-in learners only. Requires a published lesson id.
  r.post(
    '/:id/attempts',
    requireAuth,
    rateLimit({ name: 'lesson-attempt', limit: 10, windowMs: MINUTE, by: 'user' }),
    validate({ body: lessonAttemptSchema }),
    async (req, res, next) => {
      try {
        if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
        if (!(await isEnabledFor('lessons.quiz', req.userId))) {
          throw new AppError(503, 'UNAVAILABLE', { en: 'Quizzes are not available for you yet.', bn: 'এখন আপনার জন্য কুইজ চালু হয়নি।' });
        }
        const result = await submitAttempt(req.params.id, req.user, req.body.answers);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  return r;
}
