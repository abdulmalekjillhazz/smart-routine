import { describe, it, expect } from 'vitest';
import { createOutbox, createMemoryStore, isPermanentRefusal } from '../src/index.js';

const ROUTINE_ID = '65f0c0ffee0000000000abcd';
const id = (n) => `00000000-0000-4000-8000-00000000000${n}`;
const del = (n) => ({ type: 'routine.delete', routineId: ROUTINE_ID, opId: id(n) });

// Refuses the whole batch with HTTP 400 if any operation in it is bad, the way the real sync route does.
function strictServer(badIds) {
  return async (ops) => {
    if (ops.some((o) => badIds.includes(o.opId))) {
      const err = new Error('Bad Request');
      err.status = 400;
      throw err;
    }
    return ops.map((o) => ({ opId: o.opId, status: 'applied' }));
  };
}

async function statusOf(store, opId) {
  return (await store.list()).find((o) => o.opId === opId)?.status;
}

describe('outbox: a refused batch is split until the bad operation is found', () => {
  it('a 400 marks only the bad operation failed, and the rest of the queue is sent', async () => {
    const store = createMemoryStore();
    const outbox = createOutbox(store);
    for (const n of [1, 2, 3, 4, 5]) await outbox.enqueue(del(n));

    const result = await outbox.flush(strictServer([id(3)]));

    expect(result).toMatchObject({ applied: 4, rejected: 1, retryable: false });
    expect(await statusOf(store, id(3))).toBe('failed');
    expect(await outbox.summary()).toEqual({ pending: 0, failed: 1 });
  });

  it('two bad operations in one batch both fail, and the good ones are applied', async () => {
    const store = createMemoryStore();
    const outbox = createOutbox(store);
    for (const n of [1, 2, 3, 4]) await outbox.enqueue(del(n));

    const result = await outbox.flush(strictServer([id(1), id(4)]));

    expect(result).toMatchObject({ applied: 2, rejected: 2, retryable: false });
    expect(await outbox.summary()).toEqual({ pending: 0, failed: 2 });
  });

  it('a network error keeps every operation pending and counts the attempt', async () => {
    const store = createMemoryStore();
    const outbox = createOutbox(store);
    for (const n of [1, 2, 3]) await outbox.enqueue(del(n));

    const result = await outbox.flush(async () => {
      throw new Error('offline');
    });

    expect(result.retryable).toBe(true);
    expect(await outbox.summary()).toEqual({ pending: 3, failed: 0 });
    expect((await store.list())[0].attempts).toBe(1);
  });

  it('a 503 from the server is retried, not treated as a refusal', async () => {
    const outbox = createOutbox(createMemoryStore());
    await outbox.enqueue(del(1));
    const result = await outbox.flush(async () => {
      const err = new Error('Service Unavailable');
      err.status = 503;
      throw err;
    });
    expect(result.retryable).toBe(true);
    expect(await outbox.summary()).toEqual({ pending: 1, failed: 0 });
  });

  it('429 (too many requests) is retried, because it is temporary', async () => {
    const outbox = createOutbox(createMemoryStore());
    await outbox.enqueue(del(1));
    const result = await outbox.flush(async () => {
      const err = new Error('Too Many Requests');
      err.status = 429;
      throw err;
    });
    expect(result.retryable).toBe(true);
  });

  it('a failed operation can be retried after it was refused, and then discarded', async () => {
    const store = createMemoryStore();
    const outbox = createOutbox(store);
    await outbox.enqueue(del(1));
    await outbox.enqueue(del(2));
    await outbox.flush(strictServer([id(2)]));
    expect(await outbox.summary()).toEqual({ pending: 0, failed: 1 });

    await outbox.retry(id(2));
    expect(await outbox.summary()).toEqual({ pending: 1, failed: 0 });

    await outbox.flush(strictServer([id(2)]));
    await outbox.discard(id(2));
    expect(await outbox.summary()).toEqual({ pending: 0, failed: 0 });
  });
});

describe('isPermanentRefusal', () => {
  it('treats only 4xx other than 408 and 429 as permanent', () => {
    expect(isPermanentRefusal({ status: 400 })).toBe(true);
    expect(isPermanentRefusal({ status: 422 })).toBe(true);
    expect(isPermanentRefusal({ status: 408 })).toBe(false);
    expect(isPermanentRefusal({ status: 429 })).toBe(false);
    expect(isPermanentRefusal({ status: 500 })).toBe(false);
    expect(isPermanentRefusal(new Error('offline'))).toBe(false);
  });
});
