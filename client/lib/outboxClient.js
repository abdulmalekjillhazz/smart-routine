// Browser wrapper for the offline outbox: persistent UUID opIds,
// online/offline flush with exponential backoff + full jitter.
// Self-contained (no workspace import) so Next.js builds without extra deps.
// Pair with server idempotency (opId + clientId) — see server/src/services/sync.js.

export function retryDelayMs(attempts) {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attempts));
}

export function retryDelayWithJitter(attempts, random = Math.random) {
  const cap = retryDelayMs(attempts);
  const r = typeof random === 'function' ? random() : Math.random();
  const clamped = Math.min(1, Math.max(0, Number(r) || 0));
  return Math.floor(clamped * cap);
}

function makeMemoryQueue() {
  const items = new Map();
  return {
    async list() { return [...items.values()]; },
    async put(op) { items.set(op.opId, { ...op }); },
    async remove(opId) { items.delete(opId); },
  };
}

export function createOutboxClient({
  queue,
  sendBatch,
  clock = () => Date.now(),
  makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  baseDelay = (attempts) => retryDelayWithJitter(attempts),
} = {}) {
  const backing = queue ?? makeMemoryQueue();
  let timer = null;
  let failures = 0;
  let flushing = false;

  async function flushNow() {
    if (flushing || typeof sendBatch !== 'function') return null;
    flushing = true;
    try {
      const pending = (await backing.list()).filter((o) => o.status !== 'failed');
      if (pending.length === 0) { failures = 0; return { applied: 0 }; }
      const results = await sendBatch(pending.map(({ status: _s, attempts: _a, lastError: _e, queuedAt: _q, ...wire }) => wire));
      let applied = 0;
      for (const r of results || []) {
        if (['applied', 'replayed', 'not_found'].includes(r.status)) {
          await backing.remove(r.opId);
          applied += 1;
        }
      }
      failures = 0;
      return { applied };
    } catch {
      failures += 1;
      schedule();
      return { retryable: true };
    } finally {
      flushing = false;
    }
  }

  function schedule() {
    clearTimeout(timer);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const delay = baseDelay(failures);
    timer = setTimeout(flushNow, delay);
    if (timer?.unref) timer.unref();
  }

  function onOnline() {
    failures = 0; // rapid offline→online transition flushes immediately
    flushNow();
  }

  function start() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', () => clearTimeout(timer));
      if (typeof navigator === 'undefined' || navigator.onLine !== false) flushNow();
    }
  }

  function stop() {
    clearTimeout(timer);
    if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
  }

  async function enqueue(op) {
    // Every mutation carries a persistent UUID for idempotency.
    const record = { ...op, opId: op.opId ?? makeId(), status: 'pending', attempts: 0, queuedAt: clock() };
    await backing.put(record);
    schedule();
    return record.opId;
  }

  return {
    enqueue, flushNow, start, stop,
    summary: async () => ({ pending: (await backing.list()).length }),
  };
}
