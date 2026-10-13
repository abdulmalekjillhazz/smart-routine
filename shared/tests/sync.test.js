import { describe, it, expect } from 'vitest';
import { syncBodySchema, syncOpSchema } from '../src/index.js';

const OP_ID = '6f1c2b1e-9a4d-4c3b-8e2f-1a2b3c4d5e6f';
const ROUTINE_ID = '65f0c0ffee0000000000abcd';

describe('syncOpSchema', () => {
  it('accepts a routine.create with an offline clientId', () => {
    const r = syncOpSchema.safeParse({
      opId: OP_ID,
      type: 'routine.create',
      data: { title: 'Walk', startTime: '06:00', endTime: '06:30', clientId: OP_ID },
    });
    expect(r.success).toBe(true);
  });

  it('rejects an opId that is not a UUID', () => {
    const r = syncOpSchema.safeParse({ opId: 'abc', type: 'routine.delete', routineId: ROUTINE_ID });
    expect(r.success).toBe(false);
  });

  it('rejects an unknown operation type', () => {
    const r = syncOpSchema.safeParse({ opId: OP_ID, type: 'routine.nuke', routineId: ROUTINE_ID });
    expect(r.success).toBe(false);
  });

  it('rejects unknown fields inside an operation', () => {
    const r = syncOpSchema.safeParse({ opId: OP_ID, type: 'routine.delete', routineId: ROUTINE_ID, userId: ROUTINE_ID });
    expect(r.success).toBe(false);
  });

  it('rejects a routine.update that tries to set expectedVersion (sync has no version check)', () => {
    const r = syncOpSchema.safeParse({
      opId: OP_ID, type: 'routine.update', routineId: ROUTINE_ID, data: { title: 'x', expectedVersion: 2 },
    });
    expect(r.success).toBe(false);
  });
});

describe('syncBodySchema', () => {
  it('caps a batch at 100 operations', () => {
    const op = { opId: OP_ID, type: 'routine.delete', routineId: ROUTINE_ID };
    expect(syncBodySchema.safeParse({ ops: Array(101).fill(op) }).success).toBe(false);
    expect(syncBodySchema.safeParse({ ops: Array(100).fill(op) }).success).toBe(true);
  });

  it('refuses an empty batch', () => {
    expect(syncBodySchema.safeParse({ ops: [] }).success).toBe(false);
  });
});
