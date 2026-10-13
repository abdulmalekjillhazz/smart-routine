import { z } from 'zod';

const httpsUrl = z.string().max(2048).regex(/^https:\/\//, 'must be an https URL');

export const pushSubscribeSchema = z
  .object({
    endpoint: httpsUrl,
    keys: z
      .object({
        p256dh: z.string().min(10).max(200),
        auth: z.string().min(5).max(100),
      })
      .strict(),
  })
  .strict();

export const pushUnsubscribeSchema = z.object({ endpoint: httpsUrl }).strict();
