import { z } from 'zod';

// Optional values copied from .env.example are often left empty. An empty string means "not set".
export function withoutEmpty(source) {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== '' && value !== undefined));
}

// The browser sends Origin without a trailing slash, so the CSRF check needs the same form.
// A path is refused, because the origin check compares scheme, host, and port only.
const clientOrigin = z
  .string()
  .url()
  .transform((value) => value.replace(/\/+$/, ''))
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.pathname === '/' && !url.search && !url.hash;
    } catch {
      return false;
    }
  }, 'must be an origin such as https://example.com, with no path');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\/\S+$/, 'must start with mongodb:// or mongodb+srv://'),
    CLIENT_ORIGIN: clientOrigin,
    VAPID_PUBLIC_KEY: z.string().min(40).optional(),
    VAPID_PRIVATE_KEY: z.string().min(20).optional(),
    VAPID_SUBJECT: z.string().regex(/^(mailto:|https:\/\/)/, 'must start with mailto: or https://').optional(),
    SCHEDULER_ENABLED: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
    // 32 random bytes, base64. Encrypts admin two-factor secrets at rest.
    ADMIN_ENC_KEY: z
      .string()
      .optional()
      .refine((v) => v === undefined || Buffer.from(v, 'base64').length === 32, 'must be base64 for 32 random bytes'),
    // Optional. Enables error tracking. Events are scrubbed before sending.
    SENTRY_DSN: z.string().url().optional(),
    // Optional. When set, /api/ready shows check details to callers who send this value in X-Ready-Token.
    READY_TOKEN: z.string().min(32, 'must be at least 32 characters').optional(),
    // Keyed hash secret for training data pseudonyms. Required only for the export. Never committed.
    TRAINING_SECRET: z.string().min(32, 'must be at least 32 characters').optional(),
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  })
  .superRefine((c, ctx) => {
    const vapid = [c.VAPID_PUBLIC_KEY, c.VAPID_PRIVATE_KEY, c.VAPID_SUBJECT].filter(Boolean).length;
    if (vapid > 0 && vapid < 3) {
      ctx.addIssue({ code: 'custom', path: ['VAPID_PUBLIC_KEY'], message: 'set all three VAPID values, or none' });
    }
    const cloud = [c.CLOUDINARY_CLOUD_NAME, c.CLOUDINARY_API_KEY, c.CLOUDINARY_API_SECRET].filter(Boolean).length;
    if (cloud > 0 && cloud < 3) {
      ctx.addIssue({ code: 'custom', path: ['CLOUDINARY_CLOUD_NAME'], message: 'set all three CLOUDINARY values, or none' });
    }
  });

// Fails fast at boot. The error names the variables, never their values.
export function loadEnv(source = process.env) {
  const result = schema.safeParse(withoutEmpty(source));
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => i.path.join('.') || 'env'))];
    throw new Error(`Invalid or missing environment variables: ${names.join(', ')}. See server/.env.example.`);
  }
  return Object.freeze(result.data);
}
