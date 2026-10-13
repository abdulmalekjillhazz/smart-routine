import { AppError, MSG } from '../lib/AppError.js';
import { isCloudinaryConfigured } from '../services/cloudinary.js';

const STAFF_MFA_WINDOW_MS = 12 * 60 * 60 * 1000;
const forbidden = (en, bn) => new AppError(403, 'FORBIDDEN', { en, bn });

// Any staff role (viewer, editor, owner). Used by the two-factor setup, which must run before MFA exists.
export function requireStaff(req, _res, next) {
  if ((req.user?.role ?? 'user') === 'user') return next(forbidden('Staff access only.', 'শুধু স্টাফদের জন্য।'));
  next();
}

// Staff with two-factor sign-in on, and a code checked recently on this session.
export function requireAdmin(req, _res, next) {
  if ((req.user?.role ?? 'user') === 'user') return next(forbidden('Staff access only.', 'শুধু স্টাফদের জন্য।'));
  if (!req.user.mfa?.enabled) {
    return next(forbidden('Turn on two-factor sign-in first.', 'প্রথমে দুই-ধাপ যাচাই চালু করুন।'));
  }
  const at = req.session?.mfaVerifiedAt ? new Date(req.session.mfaVerifiedAt).getTime() : 0;
  if (Date.now() - at > STAFF_MFA_WINDOW_MS) {
    return next(forbidden('Enter a code from your authenticator app to continue.', 'কাজ চালিয়ে যেতে আপনার অ্যাপের কোড দিন।'));
  }
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(forbidden('Your role does not allow this action.', 'এই কাজের অনুমতি আপনার ভূমিকায় নেই।'));
    }
    next();
  };
}

export function requireCloudinary(_req, _res, next) {
  if (!isCloudinaryConfigured()) return next(new AppError(503, 'UNAVAILABLE', MSG.unavailable));
  next();
}
