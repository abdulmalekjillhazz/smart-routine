import { Router } from 'express';
import {
  lessonDraftSchema,
  storyDraftSchema,
  roleChangeSchema,
  mfaCodeSchema,
  uploadSignatureSchema,
  attachMediaSchema,
  auditQuerySchema,
} from '@smart-routine/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { requireStaff, requireAdmin, requireRole, requireCloudinary } from '../middleware/roles.js';
import { writeAudit, listAudit } from '../services/audit.js';
import * as mfa from '../services/mfa.js';
import { setRole } from '../services/roles.js';
import { createDraft, submitForReview, publishLesson, archiveLesson, listAllLessons } from '../services/lessons.js';
import { createStoryDraft, submitStoryForReview, publishStory, archiveStory, listAllStories } from '../services/stories.js';
import { createSignature, attachMedia, detachMedia, attachStoryAudio, detachStoryAudio, cleanupUploads } from '../services/uploads.js';
import { setFlag } from '../services/flags.js';
import { FLAG_DEFAULTS } from '@smart-routine/shared';
import { AppError, MSG } from '../lib/AppError.js';
import { sha256 } from '../lib/crypto.js';
import { SESSION_COOKIE } from '../lib/cookies.js';
import { Session } from '../models/Session.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export function adminRouter(config) {
  const r = Router();
  r.use(requireAuth);

  // Two-factor setup and sign-in. Staff only, but these run before MFA is active.
  r.post('/mfa/setup', requireStaff, rateLimit({ name: 'mfa-setup', limit: 5, windowMs: HOUR, by: 'user' }), async (req, res, next) => {
    try {
      res.json(await mfa.beginSetup(req.userId, req.user.email, config));
    } catch (err) {
      next(err);
    }
  });

  r.post('/mfa/confirm', requireStaff, rateLimit({ name: 'mfa-confirm', limit: 10, windowMs: HOUR, by: 'user' }), validate({ body: mfaCodeSchema }), async (req, res, next) => {
    try {
      await mfa.confirmSetup(req.userId, req.body.code, config);
      await writeAudit({ actor: req.user, action: 'mfa.enabled', targetType: 'user', targetId: req.userId, requestId: req.id });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  r.post('/mfa/verify', requireStaff, rateLimit({ name: 'mfa-verify', limit: 10, windowMs: MINUTE, by: 'user' }), validate({ body: mfaCodeSchema }), async (req, res, next) => {
    try {
      const session = await Session.findOne({ currentHash: sha256(req.cookies[SESSION_COOKIE]) }).lean();
      await mfa.verifyForSession(req.userId, session._id, req.body.code, config);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Everything below needs staff role, two-factor sign-in, and a recent code.
  r.use(requireAdmin);

  r.get('/audit-log', requireRole('viewer', 'editor', 'owner'), validate({ query: auditQuerySchema }), async (req, res, next) => {
    try {
      res.json(await listAudit(req.query));
    } catch (err) {
      next(err);
    }
  });

  r.post('/users/:id/role', requireRole('owner'), validate({ body: roleChangeSchema }), async (req, res, next) => {
    try {
      const target = await setRole(req.user, req.params.id, req.body.role);
      await writeAudit({ actor: req.user, action: 'role.change', targetType: 'user', targetId: req.params.id, summary: `role=${req.body.role}`, requestId: req.id });
      res.json({ user: { id: String(target._id), role: target.role } });
    } catch (err) {
      next(err);
    }
  });

  r.get('/lessons', requireRole('viewer', 'editor', 'owner'), async (_req, res, next) => {
    try {
      const lessons = await listAllLessons();
      res.json({ lessons: lessons.map((l) => ({ id: String(l._id), slug: l.slug, status: l.status, createdAt: l.createdAt })) });
    } catch (err) {
      next(err);
    }
  });

  r.post('/lessons', requireRole('editor', 'owner'), validate({ body: lessonDraftSchema }), async (req, res, next) => {
    try {
      const lesson = await createDraft(req.user, req.body);
      await writeAudit({ actor: req.user, action: 'lesson.create', targetType: 'lesson', targetId: lesson._id, summary: `slug=${lesson.slug}`, requestId: req.id });
      res.status(201).json({ lesson: { id: String(lesson._id), slug: lesson.slug, status: lesson.status } });
    } catch (err) {
      next(err);
    }
  });

  r.post('/lessons/:slug/submit', requireRole('editor', 'owner'), async (req, res, next) => {
    try {
      const lesson = await submitForReview(req.params.slug, req.user);
      await writeAudit({ actor: req.user, action: 'lesson.submit', targetType: 'lesson', targetId: lesson._id, summary: `slug=${lesson.slug}`, requestId: req.id });
      res.json({ lesson: { slug: lesson.slug, status: lesson.status } });
    } catch (err) {
      next(err);
    }
  });

  r.post('/lessons/:slug/publish', requireRole('editor', 'owner'), async (req, res, next) => {
    try {
      const lesson = await publishLesson(req.params.slug, req.user);
      await writeAudit({ actor: req.user, action: 'lesson.publish', targetType: 'lesson', targetId: lesson._id, summary: `slug=${lesson.slug}`, requestId: req.id });
      res.json({ lesson: { slug: lesson.slug, status: lesson.status } });
    } catch (err) {
      next(err);
    }
  });

  r.post('/lessons/:slug/archive', requireRole('owner'), async (req, res, next) => {
    try {
      const lesson = await archiveLesson(req.params.slug, req.user);
      await detachMedia(lesson.slug);
      await writeAudit({ actor: req.user, action: 'lesson.archive', targetType: 'lesson', targetId: lesson._id, summary: `slug=${lesson.slug}`, requestId: req.id });
      res.json({ lesson: { slug: lesson.slug, status: lesson.status } });
    } catch (err) {
      next(err);
    }
  });

  r.post('/uploads/signature', requireRole('editor', 'owner'), requireCloudinary, validate({ body: uploadSignatureSchema }), async (req, res, next) => {
    try {
      const signed = await createSignature(req.user, req.body.resourceType);
      await writeAudit({ actor: req.user, action: 'upload.sign', targetType: 'upload', targetId: signed.publicId, summary: `type=${req.body.resourceType}`, requestId: req.id });
      res.json(signed);
    } catch (err) {
      next(err);
    }
  });

  r.post('/lessons/:slug/media', requireRole('editor', 'owner'), requireCloudinary, validate({ body: attachMediaSchema }), async (req, res, next) => {
    try {
      const lesson = await attachMedia(req.params.slug, req.user, req.body);
      await writeAudit({ actor: req.user, action: 'media.attach', targetType: 'lesson', targetId: lesson._id, summary: `type=${req.body.resourceType}`, requestId: req.id });
      res.json({ lesson: { slug: lesson.slug, media: { type: lesson.media.resourceType, url: lesson.media.url } } });
    } catch (err) {
      next(err);
    }
  });

  r.delete('/lessons/:slug/media', requireRole('editor', 'owner'), async (req, res, next) => {
    try {
      const lesson = await detachMedia(req.params.slug);
      await writeAudit({ actor: req.user, action: 'media.detach', targetType: 'lesson', targetId: lesson._id, summary: `slug=${lesson.slug}`, requestId: req.id });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Stories: text in MongoDB, voice in Cloudinary.
  r.get('/stories', requireRole('viewer', 'editor', 'owner'), async (_req, res, next) => {
    try {
      const stories = await listAllStories();
      res.json({ stories: stories.map((s) => ({ id: String(s._id), slug: s.slug, status: s.status, createdAt: s.createdAt })) });
    } catch (err) {
      next(err);
    }
  });

  r.post('/stories', requireRole('editor', 'owner'), validate({ body: storyDraftSchema }), async (req, res, next) => {
    try {
      const story = await createStoryDraft(req.user, req.body);
      await writeAudit({ actor: req.user, action: 'story.create', targetType: 'story', targetId: story._id, summary: `slug=${story.slug}`, requestId: req.id });
      res.status(201).json({ story: { id: String(story._id), slug: story.slug, status: story.status } });
    } catch (err) {
      next(err);
    }
  });

  r.post('/stories/:slug/submit', requireRole('editor', 'owner'), async (req, res, next) => {
    try {
      const story = await submitStoryForReview(req.params.slug, req.user);
      await writeAudit({ actor: req.user, action: 'story.submit', targetType: 'story', targetId: story._id, summary: `slug=${story.slug}`, requestId: req.id });
      res.json({ story: { slug: story.slug, status: story.status } });
    } catch (err) {
      next(err);
    }
  });

  r.post('/stories/:slug/publish', requireRole('editor', 'owner'), async (req, res, next) => {
    try {
      const story = await publishStory(req.params.slug, req.user);
      await writeAudit({ actor: req.user, action: 'story.publish', targetType: 'story', targetId: story._id, summary: `slug=${story.slug}`, requestId: req.id });
      res.json({ story: { slug: story.slug, status: story.status } });
    } catch (err) {
      next(err);
    }
  });

  r.post('/stories/:slug/archive', requireRole('owner'), async (req, res, next) => {
    try {
      const story = await archiveStory(req.params.slug);
      await detachStoryAudio(story.slug);
      await writeAudit({ actor: req.user, action: 'story.archive', targetType: 'story', targetId: story._id, summary: `slug=${story.slug}`, requestId: req.id });
      res.json({ story: { slug: story.slug, status: story.status } });
    } catch (err) {
      next(err);
    }
  });

  r.post('/stories/:slug/audio', requireRole('editor', 'owner'), requireCloudinary, validate({ body: attachMediaSchema }), async (req, res, next) => {
    try {
      if (req.body.resourceType !== 'audio') throw new AppError(400, 'VALIDATION_FAILED', MSG.invalid, [{ path: 'resourceType', message: 'must be audio' }]);
      const story = await attachStoryAudio(req.params.slug, req.user, req.body);
      await writeAudit({ actor: req.user, action: 'story.audio.attach', targetType: 'story', targetId: story._id, summary: `slug=${story.slug}`, requestId: req.id });
      res.json({ story: { slug: story.slug, audio: { url: story.audio.url } } });
    } catch (err) {
      next(err);
    }
  });

  r.delete('/stories/:slug/audio', requireRole('editor', 'owner'), async (req, res, next) => {
    try {
      const story = await detachStoryAudio(req.params.slug);
      await writeAudit({ actor: req.user, action: 'story.audio.detach', targetType: 'story', targetId: story._id, summary: `slug=${story.slug}`, requestId: req.id });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  r.post('/uploads/cleanup', requireRole('owner'), requireCloudinary, async (req, res, next) => {
    try {
      const stats = await cleanupUploads();
      await writeAudit({ actor: req.user, action: 'upload.cleanup', targetType: 'upload', summary: `deleted=${stats.deleted},failed=${stats.failed}`, requestId: req.id });
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  r.post('/flags/:key', requireRole('owner'), async (req, res, next) => {
    try {
      if (!Object.prototype.hasOwnProperty.call(FLAG_DEFAULTS, req.params.key)) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
      const enabled = req.body?.enabled;
      const rolloutPercent = req.body?.rolloutPercent;
      if (typeof enabled !== 'boolean' || !Number.isInteger(rolloutPercent) || rolloutPercent < 0 || rolloutPercent > 100) {
        throw new AppError(400, 'VALIDATION_FAILED', MSG.invalid, [{ path: 'enabled/rolloutPercent', message: 'enabled must be true or false; rolloutPercent 0 to 100' }]);
      }
      const flag = await setFlag(req.params.key, { enabled, rolloutPercent }, req.user._id);
      await writeAudit({ actor: req.user, action: 'flag.set', targetType: 'flag', targetId: req.params.key, summary: `enabled=${enabled},rollout=${rolloutPercent}`, requestId: req.id });
      res.json({ flag: { key: flag.key, enabled: flag.enabled, rolloutPercent: flag.rolloutPercent } });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
