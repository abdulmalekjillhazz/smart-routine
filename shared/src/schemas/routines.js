import { z } from 'zod';
import { clockSchema, dateStringSchema } from './common.js';

const routineFields = z
  .object({
    title: z.string().trim().min(1).max(120),
    startTime: clockSchema,
    endTime: clockSchema,
    category: z.string().trim().min(1).max(40).default('general'),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    note: z.string().max(300).default(''),
    isFrog: z.boolean().default(false),
  })
  .strict();

const routinePartial = routineFields.partial();

// clientId is the id the device generated while offline. The server stores it to avoid duplicates on retry.
export const routineCreateSchema = routineFields
  .extend({ clientId: z.string().uuid().optional() })
  .refine((r) => r.startTime !== r.endTime, { message: 'start and end must differ', path: ['endTime'] });

// Normal edits: expectedVersion enables optimistic concurrency (409 on mismatch).
export const routineUpdateSchema = routinePartial
  .extend({ expectedVersion: z.number().int().min(0).optional() })
  .strict()
  .refine((o) => Object.keys(o).some((k) => k !== 'expectedVersion'), 'nothing to update');

// Sync edits: no version check. Sync uses last write wins by server arrival order.
export const routineChangeSchema = routinePartial
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'nothing to update');

export const routineListQuerySchema = z.object({ date: dateStringSchema.optional() }).strict();
