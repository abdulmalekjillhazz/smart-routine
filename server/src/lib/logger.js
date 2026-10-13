import pino from 'pino';

// Redaction keeps secrets and personal text out of every log line.
// Paths are matched both at the top level and nested. Add paths here, never remove them.
export const REDACT_PATHS = [
  'password',
  'passwordHash',
  'token',
  'secret',
  'question',
  'title',
  'note',
  'email',
  'displayName',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.secret',
  '*.question',
  '*.title',
  '*.note',
  '*.email',
  '*.displayName',
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["x-csrf-token"]',
  'req.headers["x-ready-token"]',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  'headers.cookie',
  'headers.authorization',
  'headers["x-ready-token"]',
];

// Pino cannot match header names by pattern, so every header is checked here.
// Any header whose name ends in token, secret, key, password, cookie, or authorization is removed.
const SECRET_HEADER = /(token|secret|key|password|cookie|authorization)$/i;

export function scrubHeaders(headers) {
  if (!headers || typeof headers !== 'object') return headers;
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name, SECRET_HEADER.test(name) ? '[REDACTED]' : value])
  );
}

// Used as the request serializer, both for log calls and for pino-http in the app.
export function serializeRequest(req) {
  const out = pino.stdSerializers.req(req);
  if (out && out.headers) out.headers = scrubHeaders(out.headers);
  return out;
}

// destination lets tests capture output. The app uses stdout.
export function createLogger(destination, { level = 'info' } = {}) {
  return pino(
    {
      level,
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      serializers: { req: serializeRequest },
    },
    destination
  );
}

export const logger = createLogger(undefined, {
  level: process.env.NODE_ENV === 'test' ? 'silent' : process.env.LOG_LEVEL || 'info',
});
