import { enforceLimit } from '../services/rateLimit.js';
import { sha256 } from '../lib/crypto.js';

// by: 'ip' uses the client IP; by: 'user' uses the session user (requireAuth must run first).
// The identifier is hashed before it becomes a database key.
export function rateLimit({ name, limit, windowMs, by = 'ip' }) {
  return async (req, _res, next) => {
    try {
      const raw = by === 'user' ? req.userId : req.ip;
      await enforceLimit(`${name}:${sha256(raw)}`, limit, windowMs);
      next();
    } catch (err) {
      next(err);
    }
  };
}
