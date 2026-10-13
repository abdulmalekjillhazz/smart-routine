import { findDueReminders, todayInZone } from '@smart-routine/shared';
import { PushSubscription } from '../models/PushSubscription.js';
import { ReminderLog } from '../models/ReminderLog.js';
import { Routine } from '../models/Routine.js';
import { Completion } from '../models/Completion.js';
import { User } from '../models/User.js';
import { acquireLease } from './lease.js';
import { sendToUser, defaultSender } from './push.js';
import { randomToken } from '../lib/crypto.js';
import { isEnabledFor } from './flags.js';
import { logger } from '../lib/logger.js';

const LEASE_NAME = 'reminders';
const LEASE_MS = 55 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_LOG_DAYS = 7;

// Generic text on purpose: the routine title is not sent to the push service.
const PAYLOAD = {
  title: 'Smart Routine',
  body: 'একটি রুটিনের সময় হয়েছে। / A routine starts now.',
  url: '/app',
};

// One tick: check every user with a push subscription and send any reminders that are due.
export async function runReminderTick({ now = new Date(), owner, sender = defaultSender } = {}) {
  const leased = await acquireLease(LEASE_NAME, owner, LEASE_MS, now);
  if (!leased) return { skipped: 'lease-held', sent: 0, suppressed: 0, failed: 0 };

  const stats = { sent: 0, suppressed: 0, failed: 0 };
  const userIds = await PushSubscription.distinct('userId');

  for (const userId of userIds) {
    const user = await User.findById(userId).lean();
    if (!user || user.deletedAt) continue;

    if (!(await isEnabledFor('push.reminders', userId))) continue;
    const routines = await Routine.find({ userId }).lean();
    if (routines.length === 0) continue;

    const dates = [todayInZone(user.timezone, now), todayInZone(user.timezone, new Date(now.getTime() - DAY_MS))];
    const completions = await Completion.find({ userId, date: { $in: dates } }).lean();
    const completedByDate = new Map();
    for (const c of completions) {
      if (!completedByDate.has(c.date)) completedByDate.set(c.date, new Set());
      completedByDate.get(c.date).add(String(c.routineId));
    }

    const due = findDueReminders({
      routines: routines.map((r) => ({ id: String(r._id), startTime: r.startTime })),
      completedByDate,
      now,
      timezone: user.timezone,
    });

    for (const reminder of due) {
      // Claim first. If another tick already claimed it, skip. This prevents duplicate sends.
      const claimed = await claimReminder(userId, reminder);
      if (!claimed) {
        stats.suppressed += 1;
        continue;
      }
      const { delivered } = await sendToUser(userId, PAYLOAD, sender);
      if (delivered > 0) stats.sent += 1;
      else stats.failed += 1;
    }
  }

  logger.info({ ...stats }, 'reminder tick finished');
  return stats;
}

// Trade-off: a reminder is claimed before sending, so a failed send is not retried.
// For reminders, a missed one is better than a duplicate.
async function claimReminder(userId, { routineId, date, kind }) {
  try {
    await ReminderLog.create({
      userId,
      routineId,
      date,
      kind,
      sentAt: new Date(),
      expiresAt: new Date(Date.now() + REMINDER_LOG_DAYS * DAY_MS),
    });
    return true;
  } catch (err) {
    if (err.code === 11000) return false;
    throw err;
  }
}

// Starts a tick every minute. Returns a function that stops it.
export function startScheduler({ intervalMs = 60 * 1000 } = {}) {
  const owner = `${process.pid}-${randomToken(8)}`;
  const timer = setInterval(() => {
    runReminderTick({ owner }).catch((err) => logger.error({ errName: err.name }, 'reminder tick failed'));
  }, intervalMs);
  return () => clearInterval(timer);
}
