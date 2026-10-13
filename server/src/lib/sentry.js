import * as Sentry from '@sentry/node';

// Error tracking is optional. Without SENTRY_DSN, nothing is sent anywhere.
let enabled = false;

const SENSITIVE_KEY = /password|token|cookie|authorization|secret|question|title|note|email|displayname|csrf/i;

// Removes sensitive keys from any nested object, so nothing personal leaves the server.
export function scrubDeep(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEY.test(k) ? '[REDACTED]' : scrubDeep(v, depth + 1);
  }
  return out;
}

// Runs before any event is sent. Keeps the method and the path only (no query string, no body, no headers).
export function scrubEvent(event) {
  if (event.request) {
    const path = event.request.url ? String(event.request.url).split('?')[0] : undefined;
    event.request = { method: event.request.method, url: path };
  }
  delete event.user;
  delete event.breadcrumbs;
  if (event.extra) event.extra = scrubDeep(event.extra);
  if (event.contexts) event.contexts = scrubDeep(event.contexts);
  if (event.tags) event.tags = scrubDeep(event.tags);
  return event;
}

export function initSentry({ dsn, environment }) {
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
  enabled = true;
  return true;
}

// Sends only the error class and code. Messages can contain user values (for example a duplicate email).
export function captureError(err, requestId) {
  if (!enabled) return;
  const safe = new Error(`${err.name || 'Error'}${err.code ? ` code ${err.code}` : ''}`);
  Sentry.captureException(safe, { tags: { requestId: String(requestId || '') } });
}
