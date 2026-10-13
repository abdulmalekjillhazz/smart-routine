export const SESSION_COOKIE = 'sr_session';
export const CSRF_COOKIE = 'sr_csrf';
export const CSRF_HEADER = 'x-csrf-token';
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function base(config) {
  // Secure is on in production (HTTPS). In development and tests it is off so http://localhost works.
  return { path: '/', sameSite: 'lax', secure: config.NODE_ENV === 'production' };
}

export function setSessionCookies(res, config, token, csrf) {
  res.cookie(SESSION_COOKIE, token, { ...base(config), httpOnly: true, maxAge: SESSION_TTL_MS });
  // The CSRF cookie must be readable by JavaScript, so the app can echo it in a header.
  res.cookie(CSRF_COOKIE, csrf, { ...base(config), httpOnly: false, maxAge: SESSION_TTL_MS });
}

export function setCsrfCookie(res, config, csrf) {
  res.cookie(CSRF_COOKIE, csrf, { ...base(config), httpOnly: false, maxAge: SESSION_TTL_MS });
}

export function clearSessionCookies(res, config) {
  res.clearCookie(SESSION_COOKIE, { ...base(config), httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...base(config), httpOnly: false });
}
