import { RateLimit } from '../models/RateLimit.js';
import { AppError, MSG } from '../lib/AppError.js';

function bucket(key, windowMs, now = Date.now()) {
  const index = Math.floor(now / windowMs);
  return {
    key: `${key}|${index}`,
    expiresAt: new Date((index + 1) * windowMs + 60_000),
  };
}

// Adds one hit and returns the count in this window. Retries once on a duplicate-key race.
export async function hitCounter(key, windowMs) {
  const { key: k, expiresAt } = bucket(key, windowMs);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const doc = await RateLimit.findOneAndUpdate(
        { key: k },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, new: true }
      ).lean();
      return doc.count;
    } catch (err) {
      if (err.code !== 11000 || attempt === 1) throw err;
    }
  }
  return 0;
}

// Reads the count without adding a hit.
export async function currentCount(key, windowMs) {
  const { key: k } = bucket(key, windowMs);
  const doc = await RateLimit.findOne({ key: k }).lean();
  return doc?.count ?? 0;
}

export async function enforceLimit(key, limit, windowMs) {
  const count = await hitCounter(key, windowMs);
  if (count > limit) throw new AppError(429, 'RATE_LIMITED', MSG.rateLimited);
}
