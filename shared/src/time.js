// One place for date and timezone rules. Used by the API and (later) the web app.
// Uses only built-in Intl, so there is no date library to keep updated.

export const DEFAULT_TIMEZONE = 'Asia/Dhaka';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidTimeZone(zone) {
  if (typeof zone !== 'string' || zone.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

// Checks that a YYYY-MM-DD string is a real calendar date (rejects 2026-02-29 and 2026-13-01).
export function isValidDateString(value) {
  const m = DATE_RE.exec(typeof value === 'string' ? value : '');
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

// The "logical day" for a user: the calendar date in their own timezone.
export function todayInZone(zone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// HH:mm strings compare correctly as text, so a routine that ends earlier than it starts crosses midnight.
export function crossesMidnight(startTime, endTime) {
  return endTime < startTime;
}

// Minutes since midnight in the given timezone (0 to 1439) for an instant.
export function minutesInZone(now, zone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return get('hour') * 60 + get('minute');
}
