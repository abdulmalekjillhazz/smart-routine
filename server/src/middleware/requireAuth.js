import { SESSION_COOKIE } from '../lib/cookies.js';
import { loadSession, loadUserForSession } from '../services/session.js';

// Sets req.user and req.userId from the session. Nothing from the request body is trusted for identity.
export async function requireAuth(req, _res, next) {
  try {
    const session = await loadSession(req.cookies?.[SESSION_COOKIE]);
    const user = await loadUserForSession(session);
    req.session = session;
    req.user = user;
    req.userId = String(user._id);
    next();
  } catch (err) {
    next(err);
  }
}
