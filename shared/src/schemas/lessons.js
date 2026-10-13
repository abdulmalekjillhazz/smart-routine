import { z } from 'zod';

const bn = (max) => z.string().trim().min(1).max(max);
const bilingual = (max) => z.object({ bn: bn(max), en: bn(max) }).strict();

export const lessonSlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase letters, digits and hyphens only');

// A lesson as written by an author. Bilingual throughout (Bangla first).
export const lessonDraftSchema = z
  .object({
    slug: lessonSlugSchema,
    title: bilingual(200),
    body: bilingual(5000),
    vocabulary: z
      .array(z.object({ word: bn(60), meaning: bilingual(200) }).strict())
      .max(30)
      .default([]),
    quiz: z
      .array(
        z
          .object({
            question: bilingual(300),
            options: z.array(bilingual(120)).length(4),
            answerIndex: z.number().int().min(0).max(3),
          })
          .strict()
      )
      .max(20)
      .default([]),
    aiDrafted: z.boolean().default(false),
  })
  .strict();

// What a learner sends when submitting a quiz. One answer per question, each 0 to 3.
export const lessonAttemptSchema = z
  .object({
    answers: z.array(z.number().int().min(0).max(3)).min(1).max(20),
  })
  .strict();
