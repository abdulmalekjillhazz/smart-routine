import { minutesInZone, todayInZone } from './time.js';

// A reminder is sent only in the first 10 minutes after a routine starts.
// This also means a reminder that is more than 10 minutes late is never sent (stale).
export const REMINDER_WINDOW_MINUTES = 10;

const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const DAY_MS = 24 * 60 * 60 * 1000;

// Pure function: no database, no network. The server scheduler and the web app both use it.
// routines: [{ id, startTime }]
// completedByDate: Map<dateString, Set<routineId>>  (routines already marked for that day)
export function findDueReminders({ routines, completedByDate = new Map(), now = new Date(), timezone }) {
  const nowMin = minutesInZone(now, timezone);
  const today = todayInZone(timezone, now);
  const yesterday = todayInZone(timezone, new Date(now.getTime() - DAY_MS));

  const due = [];
  for (const routine of routines) {
    const startMin = toMinutes(routine.startTime);
    // Minutes since the routine started, wrapping at midnight (a 23:58 start is 2 minutes old at 00:00).
    const elapsed = (nowMin - startMin + 1440) % 1440;
    if (elapsed >= REMINDER_WINDOW_MINUTES) continue;

    // If the clock has wrapped past midnight, the routine belongs to yesterday's logical day.
    const date = nowMin >= startMin ? today : yesterday;
    if (completedByDate.get(date)?.has(routine.id)) continue;

    due.push({ routineId: routine.id, date, kind: 'start' });
  }
  return due;
}
