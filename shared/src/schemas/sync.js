import { z } from 'zod';
import { routineCreateSchema, routineChangeSchema } from './routines.js';
import { completionSchema } from './completions.js';
import { objectIdSchema } from './common.js';

// Every operation carries a client-made opId (UUID). The server uses it so a retry never applies twice.
const opId = z.string().uuid();

export const syncOpSchema = z.discriminatedUnion('type', [
  z.object({ opId, type: z.literal('routine.create'), data: routineCreateSchema }).strict(),
  z.object({ opId, type: z.literal('routine.update'), routineId: objectIdSchema, data: routineChangeSchema }).strict(),
  z.object({ opId, type: z.literal('routine.delete'), routineId: objectIdSchema }).strict(),
  z.object({ opId, type: z.literal('completion.set'), data: completionSchema }).strict(),
]);

export const syncBodySchema = z
  .object({
    ops: z.array(syncOpSchema).min(1).max(100),
  })
  .strict();
