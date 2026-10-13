import { z } from 'zod';

const bn = (max) => z.string().trim().min(1).max(max);
const bilingual = (max) => z.object({ bn: bn(max), en: bn(max) }).strict();

export const storySlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase letters, digits and hyphens only');

// A story as written by an author. Text lives in MongoDB, voice lives in Cloudinary.
export const storyDraftSchema = z
  .object({
    slug: storySlugSchema,
    title: bilingual(200),
    body: bilingual(20000),
  })
  .strict();
