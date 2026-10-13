import { AppError, MSG } from '../lib/AppError.js';
import { CSRF_COOKIE, CSRF_HEADER } from '../lib/cookies.js';
import { safeEqual } from '../lib/crypto.js';

// Double-submit cookie check, plus an Origin check.
// A request with a foreign Origin is refused. Safe methods (GET, HEAD, OPTIONS) skip the check.
export function csrfProtection(config) {
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    const origin = req.get('origin');
    if (origin && origin !== config.CLIENT_ORIGIN) {
      return next(new AppError(403, 'CSRF_FAILED', MSG.csrf));
    }

    const cookie = req.cookies?.[CSRF_COOKIE];
    const header = req.get(CSRF_HEADER);
    if (!cookie || !header || !safeEqual(cookie, header)) {
      return next(new AppError(403, 'CSRF_FAILED', MSG.csrf));
    }
    next();
  };
}
