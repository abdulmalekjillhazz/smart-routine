import { Router } from 'express';
import { registerSchema, loginSchema } from '@smart-routine/shared';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { randomToken } from '../lib/crypto.js';
import { SESSION_COOKIE, setCsrfCookie, setSessionCookies, clearSessionCookies } from '../lib/cookies.js';
import { registerUser, loginUser } from '../services/account.js';
import {
  createSession,
  loadSession,
  loadUserForSession,
  rotateSession,
  revokeSessionByToken,
} from '../services/session.js';
import { toPublicUser } from '../services/dto.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export function authRouter(config) {
  const r = Router();

  // The browser calls this first to get a CSRF token for its state-changing requests.
  r.get('/csrf', (_req, res) => {
    const csrfToken = randomToken(32);
    setCsrfCookie(res, config, csrfToken);
    res.json({ csrfToken });
  });

  r.post(
    '/register',
    rateLimit({ name: 'register', limit: 5, windowMs: HOUR }),
    validate({ body: registerSchema }),
    async (req, res, next) => {
      try {
        const user = await registerUser(req.body);
        const { token, csrf } = await createSession(user._id);
        setSessionCookies(res, config, token, csrf);
        res.status(201).json({ user: toPublicUser(user), csrfToken: csrf });
      } catch (err) {
        next(err);
      }
    }
  );

  r.post(
    '/login',
    rateLimit({ name: 'login-ip', limit: 20, windowMs: 15 * MINUTE }),
    validate({ body: loginSchema }),
    async (req, res, next) => {
      try {
        const user = await loginUser(req.body);
        const { token, csrf } = await createSession(user._id);
        setSessionCookies(res, config, token, csrf);
        res.json({ user: toPublicUser(user), csrfToken: csrf });
      } catch (err) {
        next(err);
      }
    }
  );

  r.post('/logout', async (req, res, next) => {
    try {
      await revokeSessionByToken(req.cookies?.[SESSION_COOKIE]);
      clearSessionCookies(res, config);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Rotates the session token. Presenting an old token later revokes the whole family.
  r.post('/refresh', rateLimit({ name: 'refresh', limit: 60, windowMs: MINUTE }), async (req, res, next) => {
    try {
      const session = await loadSession(req.cookies?.[SESSION_COOKIE]);
      const user = await loadUserForSession(session);
      const { token, csrf } = await rotateSession(session);
      setSessionCookies(res, config, token, csrf);
      res.json({ user: toPublicUser(user), csrfToken: csrf });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
