import mongoose from 'mongoose';
import { AppError, MSG } from '../lib/AppError.js';

export function dbRequired(_req, _res, next) {
  if (mongoose.connection.readyState !== 1) {
    return next(new AppError(503, 'UNAVAILABLE', MSG.unavailable));
  }
  next();
}
