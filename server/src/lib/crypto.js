import crypto from 'node:crypto';

// Random tokens and ids: always from the OS random source, never Math.random.
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

// We store hashes of tokens, so a database leak does not reveal live sessions.
export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

// Constant-time comparison for secrets such as CSRF tokens.
export function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}
