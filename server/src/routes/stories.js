import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import { listPublishedStories, findPublishedStoryBySlug, toPublicStory } from '../services/stories.js';

const MINUTE = 60 * 1000;

export function storiesRouter() {
  const r = Router();

  // Public: published stories only. Text from MongoDB, voice URL from Cloudinary.
  r.get('/', rateLimit({ name: 'stories-list', limit: 120, windowMs: MINUTE }), async (_req, res, next) => {
    try {
      res.json({ stories: await listPublishedStories() });
    } catch (err) {
      next(err);
    }
  });

  r.get('/:slug', rateLimit({ name: 'stories-read', limit: 120, windowMs: MINUTE }), async (req, res, next) => {
    try {
      const story = await findPublishedStoryBySlug(req.params.slug);
      res.json({ story: toPublicStory(story) });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
