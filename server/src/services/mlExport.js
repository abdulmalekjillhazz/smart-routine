import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { Routine } from '../models/Routine.js';
import { Completion } from '../models/Completion.js';
import { TRAINING_CONSENT_VERSION } from '@smart-routine/shared';

export const CSV_HEADER = ['user_hash', 'day', 'start_hour', 'duration_min', 'weekday', 'priority', 'missed'];

// Keyed hash: without the secret, a hash cannot be matched back to a user id.
export function pseudonymize(secret, userId) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('TRAINING_SECRET must be set and at least 32 characters');
  }
  return crypto.createHmac('sha256', secret).update(String(userId)).digest('hex').slice(0, 16);
}

// Day of week for a calendar date string, Sunday = 0. Pure calendar arithmetic, no timezone involved.
export function weekdayOf(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function toCsv(rows) {
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) lines.push(CSV_HEADER.map((k) => String(r[k])).join(','));
  return lines.join('\n') + '\n';
}

// Builds training rows for users who consented to the current version and have not deleted their account.
// Only done and missed count. "Skipped" is left out because it does not say whether the routine was missed.
export async function buildTrainingRows(secret) {
  const consented = await User.find({
    deletedAt: null,
    'consents.modelTraining.granted': true,
    'consents.modelTraining.version': TRAINING_CONSENT_VERSION,
  })
    .select('_id')
    .lean();
  if (consented.length === 0) return [];

  const userIds = consented.map((u) => u._id);
  const hashById = new Map(userIds.map((id) => [String(id), pseudonymize(secret, String(id))]));
  const routines = await Routine.find({ userId: { $in: userIds } }).lean();
  const routineById = new Map(routines.map((r) => [String(r._id), r]));
  const completions = await Completion.find({ userId: { $in: userIds }, status: { $in: ['done', 'missed'] } }).lean();

  const rows = [];
  for (const c of completions) {
    const r = routineById.get(String(c.routineId));
    if (!r) continue;
    const [sh, sm] = r.startTime.split(':').map(Number);
    const [eh, em] = r.endTime.split(':').map(Number);
    let duration = eh * 60 + em - (sh * 60 + sm);
    if (duration <= 0) duration += 1440;
    rows.push({
      user_hash: hashById.get(String(c.userId)),
      day: c.date,
      start_hour: sh,
      duration_min: duration,
      weekday: weekdayOf(c.date),
      priority: r.priority,
      missed: c.status === 'missed' ? 1 : 0,
    });
  }
  return rows;
}
