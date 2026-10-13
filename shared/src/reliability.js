// Reliability helpers shared by client and server.
// Pure functions only: no DOM, no network, so they are unit-testable.

import { retryDelayMs } from './outbox.js';

// Deterministic conflict rule for the same routine + calendar date:
// "done" always wins over "missed" / "skipped". Used when an offline
// completion races a server-side completion (another device, scheduler).
// Returns the status that must be stored.
export function resolveCompletionConflict(localStatus, remoteStatus) {
  const rank = (s) => (s === 'done' ? 2 : s === 'skipped' ? 1 : 0);
  if (!localStatus) return remoteStatus;
  if (!remoteStatus) return localStatus;
  return rank(localStatus) >= rank(remoteStatus) ? localStatus : remoteStatus;
}

// Exponential backoff with full jitter for offline->online flush.
// base = retryDelayMs(attempts); actual = random in [0, base].
// random defaults to Math.random but is injectable for tests.
export function retryDelayWithJitter(attempts, random = Math.random) {
  const cap = retryDelayMs(attempts);
  const r = typeof random === 'function' ? random() : Math.random();
  const clamped = Math.min(1, Math.max(0, Number(r) || 0));
  return Math.floor(clamped * cap);
}
