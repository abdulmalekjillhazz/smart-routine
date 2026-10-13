import { describe, it, expect } from 'vitest';
import { findDueReminders, minutesInZone } from '../src/index.js';

// Dhaka is UTC+6 with no daylight saving time. 08:03 Dhaka on 2026-10-10 is 02:03 UTC.
const DHAKA = 'Asia/Dhaka';
const at = (iso) => new Date(iso);
const routines = [{ id: 'r1', startTime: '08:00' }];

describe('minutesInZone', () => {
  it('gives different minutes for the same instant in different timezones', () => {
    const instant = at('2026-10-10T02:03:00Z');
    expect(minutesInZone(instant, DHAKA)).toBe(8 * 60 + 3);
    expect(minutesInZone(instant, 'UTC')).toBe(2 * 60 + 3);
  });
});

describe('findDueReminders', () => {
  it('is due at the exact start minute', () => {
    const due = findDueReminders({ routines, now: at('2026-10-10T02:00:00Z'), timezone: DHAKA });
    expect(due).toEqual([{ routineId: 'r1', date: '2026-10-10', kind: 'start' }]);
  });

  it('is due within the first 9 minutes', () => {
    expect(findDueReminders({ routines, now: at('2026-10-10T02:09:00Z'), timezone: DHAKA })).toHaveLength(1);
  });

  it('is not due at minute 10 (stale reminders are never sent)', () => {
    expect(findDueReminders({ routines, now: at('2026-10-10T02:10:00Z'), timezone: DHAKA })).toEqual([]);
  });

  it('is not due before the start time', () => {
    expect(findDueReminders({ routines, now: at('2026-10-10T01:59:00Z'), timezone: DHAKA })).toEqual([]);
  });

  it('handles a routine starting just before midnight, with the clock past midnight', () => {
    // 00:03 on 2026-10-11 in Dhaka is 18:03 UTC on 2026-10-10.
    const late = [{ id: 'night', startTime: '23:58' }];
    const due = findDueReminders({ routines: late, now: at('2026-10-10T18:03:00Z'), timezone: DHAKA });
    expect(due).toEqual([{ routineId: 'night', date: '2026-10-10', kind: 'start' }]);
  });

  it('does not remind when the routine was already marked for that day', () => {
    const done = new Map([['2026-10-10', new Set(['r1'])]]);
    expect(findDueReminders({ routines, completedByDate: done, now: at('2026-10-10T02:00:00Z'), timezone: DHAKA })).toEqual([]);
  });

  it('timezone changes the answer: the same routine is due in Dhaka but not in UTC', () => {
    // 02:03 UTC is 08:03 in Dhaka (due for an 08:00 routine), but 02:03 in UTC (not due).
    const instant = at('2026-10-10T02:03:00Z');
    expect(findDueReminders({ routines, now: instant, timezone: DHAKA })).toHaveLength(1);
    expect(findDueReminders({ routines, now: instant, timezone: 'UTC' })).toHaveLength(0);
    // 08:00 in Dhaka is 02:00 UTC, so the matching UTC instant is 02:00.
    expect(findDueReminders({ routines, now: at('2026-10-10T02:00:00Z'), timezone: DHAKA })).toHaveLength(1);
    expect(findDueReminders({ routines, now: at('2026-10-10T08:00:00Z'), timezone: 'UTC' })).toHaveLength(1);
  });
});
