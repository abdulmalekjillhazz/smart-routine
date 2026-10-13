import { z } from 'zod';
import { dateStringSchema, objectIdSchema } from './common.js';

export const completionSchema = z
  .object({
    routineId: objectIdSchema,
    date: dateStringSchema,
    status: z.enum(['done', 'missed', 'skipped']),
  })
  .strict();
