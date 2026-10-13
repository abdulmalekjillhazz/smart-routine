import { describe, it, expect } from 'vitest';
import { createOutbox, createMemoryStore, retryDelayMs } from '../src/index.js';

const ROUTINE_ID = '65f0c0ffee0000000000abcd';
const del = () => ({ type: 'routine.delete', routineId: ROUTINE_ID });

// A fake server that remembers opIds, like the real one does with its idempotency records.
function fakeServer() {
  const seen = new Map();
  const calls = [];
  const send = async (ops) => {
    calls.push(ops.map((o) => o.opId));
    return ops.map((o) => {
      if (seen.has(o.opId)) return { opId: o.opId, status: 'replayed' };
      seen.set(o.opId, true);
      return { opId: o.opId, status: 'applied' };
    });
  };
  return { send, calls, appliedCount: () => seen.size };
}

describe('outbox', () => {
  it('refuses an invalid operation at enqueue time', async () => {
    const outbox = createOutbox(createMemoryStore());
    await expect(outbox.enqueue({ type: 'routine.nuke' })).rejects.toThrow(/Invalid sync operation/);
  });

  it('sends pending operations in the order they were queued, then clears them', async () => {
    const store = createMemoryStore();
    let t = 0;
    const outbox = createOutbox(store, { clock: () => ++t });
    const first = await outbox.enqueue(del());
    const second = await outbox.enqueue(del());
    const server = fakeServer();

    const result = await outbox.flush(server.send);
    expect(server.calls[0]).toEqual([first, second]);
    expect(result).toMatchObject({ applied: 2, rejected: 0, retryable: false });
    expect(await outbox.summary()).toEqual({ pending: 0, failed: 0 });
  });

  it('keeps everything when the network fails, and does not drop operations', async () => {
    const outbox = createOutbox(createMemoryStore());
    await outbox.enqueue(del());
    const result = await outbox.flush(async () => {
      throw new Error('offline');
    });
    expect(result.retryable).toBe(true);
    expect(await outbox.summary()).toEqual({ pending: 1, failed: 0 });
  });

  it('sends each operation exactly once even if the response was lost and the batch is retried', async () => {
    const store = createMemoryStore();
    const outbox = createOutbox(store);
    await outbox.enqueue(del());
    const server = fakeServer();

    // First attempt: the server applies the change, but the response never arrives.
    await outbox.flush(async (ops) => {
      await server.send(ops);
      throw new Error('connection dropped after server applied');
    });
    // Second attempt: the same opId is sent again, and the server replays its stored result.
    const retry = await outbox.flush(server.send);

    expect(retry.applied).toBe(1);
    expect(server.appliedCount()).toBe(1);
    expect(await outbox.summary()).toEqual({ pending: 0, failed: 0 });
  });

  it('marks a rejected operation as failed, and retry moves it back to pending', async () => {
    const outbox = createOutbox(createMemoryStore());
    const id = await outbox.enqueue(del());
    await outbox.flush(async (ops) => ops.map((o) => ({ opId: o.opId, status: 'rejected', code: 'VALIDATION_FAILED' })));
    expect(await outbox.summary()).toEqual({ pending: 0, failed: 1 });

    await outbox.retry(id);
    expect(await outbox.summary()).toEqual({ pending: 1, failed: 0 });
  });

  it('keeps in_progress operations pending for the next flush', async () => {
    const outbox = createOutbox(createMemoryStore());
    const id = await outbox.enqueue(del());
    await outbox.flush(async (ops) => ops.map((o) => ({ opId: o.opId, status: 'in_progress' })));
    expect(await outbox.summary()).toEqual({ pending: 1, failed: 0 });
    expect(id).toBeTruthy();
  });

  it('splits large queues into batches of the requested size', async () => {
    const outbox = createOutbox(createMemoryStore());
    for (let i = 0; i < 250; i += 1) await outbox.enqueue(del());
    const server = fakeServer();
    await outbox.flush(server.send, { batchSize: 100 });
    expect(server.calls.map((c) => c.length)).toEqual([100, 100, 50]);
  });

  it('refuses a second flush while one is running', async () => {
    const outbox = createOutbox(createMemoryStore());
    await outbox.enqueue(del());
    let release;
    const slow = new Promise((resolve) => {
      release = resolve;
    });
    const first = outbox.flush(async (ops) => {
      await slow;
      return ops.map((o) => ({ opId: o.opId, status: 'applied' }));
    });
    const second = await outbox.flush(async () => []);
    expect(second.busy).toBe(true);
    release();
    expect((await first).applied).toBe(1);
  });

  it('reports each server result to the caller so ids can be mapped', async () => {
    const outbox = createOutbox(createMemoryStore());
    const id = await outbox.enqueue({
      type: 'routine.create',
      data: { title: 'Walk', startTime: '06:00', endTime: '06:30' },
    });
    const seen = [];
    await outbox.flush(
      async (ops) => ops.map((o) => ({ opId: o.opId, status: 'applied', routine: { id: ROUTINE_ID } })),
      { onResult: (res, op) => seen.push({ res, op }) }
    );
    expect(seen[0].res.routine.id).toBe(ROUTINE_ID);
    expect(seen[0].op.opId).toBe(id);
  });

  it('computes a capped exponential retry delay', () => {
    expect(retryDelayMs(0)).toBe(1000);
    expect(retryDelayMs(3)).toBe(8000);
    expect(retryDelayMs(20)).toBe(60000);
  });
});
