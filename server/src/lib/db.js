import mongoose from 'mongoose';
import { logger } from './logger.js';

// Hardened connection: pooled, no auto-index in production, retry with backoff.
// Also a tiny circuit breaker so a dead DB fails fast instead of queueing forever.
let failures = 0;
let openUntil = 0;

export function dbOptions(env = process.env) {
  const isProd = (env.NODE_ENV || 'development') === 'production';
  return {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 30_000,
    autoIndex: !isProd, // false in production (explicit index builds via init/migration)
  };
}

export function circuitOpen(now = Date.now()) {
  return now < openUntil;
}

export async function connectWithRetry(uri, { env = process.env, retries = 5, baseMs = 1000 } = {}) {
  const opts = dbOptions(env);
  for (let attempt = 0; ; attempt += 1) {
    if (circuitOpen()) throw new Error('Database temporarily unavailable (circuit open).');
    try {
      await mongoose.connect(uri, opts);
      failures = 0;
      return mongoose.connection;
    } catch (err) {
      failures += 1;
      if (attempt >= retries) {
        // Open the circuit for 30s after exhausting retries.
        openUntil = Date.now() + 30_000;
        logger.error({ attempt }, 'database connection failed; circuit opened');
        throw new Error('Database connection failed. Check MONGODB_URI and that the database is reachable.');
      }
      const delay = Math.min(30_000, baseMs * 2 ** attempt + Math.floor(Math.random() * 500));
      logger.warn({ attempt, delay, failures }, 'database connection retrying');
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
