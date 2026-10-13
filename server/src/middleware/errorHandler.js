import { AppError, MSG } from '../lib/AppError.js';
import { logger } from '../lib/logger.js';
import { captureError } from '../lib/sentry.js';

function envelope(code, message, requestId, fields) {
  return { error: { code, message, requestId, ...(fields ? { fields } : {}) } };
}

export function notFound(req, res) {
  res.status(404).json(envelope('NOT_FOUND', MSG.notFound, req.id));
}

// Last middleware. Never logs request bodies, cookies, or error messages that may contain user data.
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json(envelope(err.code, err.i18n, req.id, err.fields));
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(envelope('VALIDATION_FAILED', MSG.invalid, req.id));
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json(envelope('VALIDATION_FAILED', MSG.invalid, req.id));
  }
  logger.error({ requestId: req.id, errName: err.name, errCode: err.code }, 'unhandled error');
  captureError(err, req.id);
  return res.status(500).json(envelope('INTERNAL', MSG.internal, req.id));
}
