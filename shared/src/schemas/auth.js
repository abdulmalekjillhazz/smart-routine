import { z } from 'zod';
import { emailSchema, passwordSchema, localeSchema, timeZoneSchema } from './common.js';

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    displayName: z.string().trim().min(1).max(60),
    locale: localeSchema.default('bn'),
    timezone: timeZoneSchema.default('Asia/Dhaka'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

// Used for export and delete: the user must type their password again.
export const passwordOnlySchema = z.object({ password: z.string().min(1).max(128) }).strict();

export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(60).optional(),
    locale: localeSchema.optional(),
    timezone: timeZoneSchema.optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'nothing to update');

export const consentSchema = z
  .object({
    granted: z.boolean(),
    version: z.string().trim().min(1).max(20),
  })
  .strict();
