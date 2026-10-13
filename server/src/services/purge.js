import { User } from '../models/User.js';
import { Routine } from '../models/Routine.js';
import { Completion } from '../models/Completion.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { LessonScore } from '../models/LessonScore.js';
import { ReminderLog } from '../models/ReminderLog.js';
import { IdempotencyRecord } from '../models/IdempotencyRecord.js';
import { Session } from '../models/Session.js';

export const PURGE_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function purgeCutoff(now = new Date()) {
  return new Date(now.getTime() - PURGE_AFTER_DAYS * DAY_MS);
}

// Permanently removes accounts deleted more than 30 days ago, with all of their personal data.
// Audit rows keep the user id (for accountability), and staff content keeps its author link.
// Learners never author content, so this does not orphan lessons.
export async function purgeDeletedAccounts({ now = new Date() } = {}) {
  const users = await User.find({ deletedAt: { $ne: null, $lt: purgeCutoff(now) } }).select('_id').lean();
  let purged = 0;
  for (const { _id: userId } of users) {
    await Promise.all([
      Routine.deleteMany({ userId }),
      Completion.deleteMany({ userId }),
      PushSubscription.deleteMany({ userId }),
      LessonScore.deleteMany({ userId }),
      ReminderLog.deleteMany({ userId }),
      IdempotencyRecord.deleteMany({ userId }),
      Session.deleteMany({ userId }),
    ]);
    await User.deleteOne({ _id: userId });
    purged += 1;
  }
  return { purged };
}
