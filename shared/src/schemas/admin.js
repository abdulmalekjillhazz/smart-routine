import { z } from 'zod';

export const roleValues = ['user', 'viewer', 'editor', 'owner'];

export const roleChangeSchema = z.object({ role: z.enum(roleValues) }).strict();

export const mfaCodeSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'six digits') }).strict();

export const uploadSignatureSchema = z.object({ resourceType: z.enum(['image', 'video', 'audio']) }).strict();

// Only public ids the server could have issued. A client cannot point at arbitrary Cloudinary files.
// Lessons use smart-routine/lessons/..., stories (voice) use smart-routine/stories/...
export const attachMediaSchema = z
  .object({
    publicId: z.string().regex(/^smart-routine\/(lessons|stories)\/[A-Za-z0-9]{12,40}$/, 'invalid upload id'),
    resourceType: z.enum(['image', 'video', 'audio']),
  })
  .strict();

export const auditQuerySchema = z
  .object({
    before: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
