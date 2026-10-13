// Offline outbox. It keeps operations in a store until the server confirms them.
// The store is injected: IndexedDB in the browser (added with the web app), memory in tests.
import { syncOpSchema } from './schemas/sync.js';

const LOCAL_FIELDS = ['status', 'attempts', 'lastError', 'queuedAt'];
const DONE = ['applied', 'replayed', 'not_found'];

export function createMemoryStore() {
  const items = new Map();
  return {
    async list() {
      return [...items.values()].sort((a, b) => a.queuedAt - b.queuedAt);
    },
    async put(op) {
      items.set(op.opId, { ...op });
    },
    async remove(opId) {
      items.delete(opId);
    },
  };
}

// Wait time before the next automatic retry: 1s, 2s, 4s ... capped at 60s.
export function retryDelayMs(attempts) {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attempts));
}

// A 4xx answer is a permanent refusal: retrying the same request will not change the result.
// 408 (timeout) and 429 (too many requests) are temporary, so they are retried like network errors.
// sendBatch must reject with an error whose numeric `status` is the HTTP status code.
export function isPermanentRefusal(err) {
  const status = err?.status;
  return Number.isInteger(status) && status >= 400 && status < 500 && status !== 408 && status !== 429;
}

export function createOutbox(store, { clock = () => Date.now(), makeId = () => globalThis.crypto.randomUUID() } = {}) {
  let busy = false;

  function toWire(op) {
    const wire = { ...op };
    for (const key of LOCAL_FIELDS) delete wire[key];
    return wire;
  }

  async function enqueue(op) {
    const withId = { ...op, opId: op.opId ?? makeId() };
    const parsed = syncOpSchema.safeParse(withId);
    if (!parsed.success) {
      const names = parsed.error.issues.map((i) => i.path.join('.') || 'operation').join(', ');
      throw new Error(`Invalid sync operation: ${names}`);
    }
    const record = { ...parsed.data, status: 'pending', attempts: 0, lastError: null, queuedAt: clock() };
    await store.put(record);
    return record.opId;
  }

  async function summary() {
    const all = await store.list();
    return {
      pending: all.filter((o) => o.status === 'pending').length,
      failed: all.filter((o) => o.status === 'failed').length,
    };
  }

  // Moves a failed operation back to pending so the next flush sends it again.
  async function retry(opId) {
    const op = (await store.list()).find((o) => o.opId === opId);
    if (op && op.status === 'failed') await store.put({ ...op, status: 'pending', attempts: 0, lastError: null });
  }

  // The user chooses to drop an operation that the server rejected.
  async function discard(opId) {
    await store.remove(opId);
  }

  // Sends a chunk. If the server refuses the whole chunk with a permanent 4xx, the chunk is split in
  // half and each half is sent again, until the refused operation is alone. Only that operation fails,
  // and the rest of the chunk still goes through. Returns a list of outcomes for the caller to apply.
  async function deliver(chunk, sendBatch) {
    try {
      return [{ kind: 'results', ops: chunk, results: await sendBatch(chunk.map(toWire)) }];
    } catch (err) {
      if (!isPermanentRefusal(err)) return [{ kind: 'retry', ops: chunk }];
      if (chunk.length === 1) return [{ kind: 'refused', ops: chunk, code: `http-${err.status}` }];
      const middle = Math.ceil(chunk.length / 2);
      const first = await deliver(chunk.slice(0, middle), sendBatch);
      const second = await deliver(chunk.slice(middle), sendBatch);
      return [...first, ...second];
    }
  }

  // sendBatch(ops) must resolve to an array of { opId, status, code? } from the server.
  // It must reject with an error that has a numeric `status` (a 4xx refusal), or with any other error (retryable).
  async function flush(sendBatch, { batchSize = 100, onResult } = {}) {
    if (busy) return { busy: true, applied: 0, rejected: 0, retryable: false };
    busy = true;
    try {
      const pending = (await store.list()).filter((o) => o.status === 'pending');
      let applied = 0;
      let rejected = 0;

      for (let i = 0; i < pending.length; i += batchSize) {
        const chunk = pending.slice(i, i + batchSize);
        const outcomes = await deliver(chunk, sendBatch);
        let retryable = false;

        for (const outcome of outcomes) {
          if (outcome.kind === 'retry') {
            // Nothing is dropped. The operations keep their opIds, so a retry cannot apply them twice.
            retryable = true;
            for (const op of outcome.ops) {
              await store.put({ ...op, attempts: op.attempts + 1, lastError: 'network' });
            }
          } else if (outcome.kind === 'refused') {
            const [op] = outcome.ops;
            await store.put({ ...op, status: 'failed', lastError: outcome.code });
            rejected += 1;
          } else {
            for (const result of outcome.results) {
              const op = outcome.ops.find((o) => o.opId === result.opId);
              if (!op) continue;
              if (onResult) onResult(result, op);
              if (DONE.includes(result.status)) {
                await store.remove(op.opId);
                applied += 1;
              } else if (result.status === 'rejected') {
                await store.put({ ...op, status: 'failed', lastError: result.code || 'rejected' });
                rejected += 1;
              }
              // in_progress: keep it pending. The next flush sends it again.
            }
          }
        }

        if (retryable) return { busy: false, applied, rejected, retryable: true };
      }
      return { busy: false, applied, rejected, retryable: false };
    } finally {
      busy = false;
    }
  }

  return { enqueue, flush, summary, retry, discard };
}
