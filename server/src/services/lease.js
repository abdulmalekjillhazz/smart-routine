import { SchedulerLease } from '../models/SchedulerLease.js';

// Returns true only if this owner now holds the lease. A held, unexpired lease blocks everyone else.
export async function acquireLease(name, owner, ttlMs, now = new Date()) {
  try {
    const doc = await SchedulerLease.findOneAndUpdate(
      { name, $or: [{ expiresAt: { $lt: now } }, { owner }] },
      { $set: { owner, expiresAt: new Date(now.getTime() + ttlMs) } },
      { upsert: true, new: true }
    ).lean();
    return doc?.owner === owner;
  } catch (err) {
    // Another server inserted the lease at the same moment (duplicate key). It won.
    if (err.code === 11000) return false;
    throw err;
  }
}
