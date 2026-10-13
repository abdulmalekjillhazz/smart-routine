import { describe, it, expect } from 'vitest';
import { isValidDateString, isValidTimeZone, todayInZone, crossesMidnight } from '../src/index.js';

describe('isValidDateString', () => {
  it('accepts real dates', () => {
    expect(isValidDateString('2024-02-29')).toBe(true);
    expect(isValidDateString('2026-10-10')).toBe(true);
  });
  it('rejects impossible dates and bad formats', () => {
    expect(isValidDateString('2026-02-29')).toBe(false);
    expect(isValidDateString('2026-13-01')).toBe(false);
    expect(isValidDateString('2026-13-45')).toBe(false);
    expect(isValidDateString('10/10/2026')).toBe(false);
    expect(isValidDateString(undefined)).toBe(false);
  });
});

describe('isValidTimeZone', () => {
  it('accepts IANA zones and rejects garbage', () => {
    expect(isValidTimeZone('Asia/Dhaka')).toBe(true);
    expect(isValidTimeZone('Mars/Base')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
});

describe('todayInZone', () => {
  // 19:30 UTC on Oct 9 is 01:30 on Oct 10 in Dhaka (UTC+6).
  const instant = new Date('2026-10-09T19:30:00Z');
  it('uses the user timezone, not UTC', () => {
    expect(todayInZone('Asia/Dhaka', instant)).toBe('2026-10-10');
    expect(todayInZone('UTC', instant)).toBe('2026-10-09');
  });
});

describe('crossesMidnight', () => {
  it('detects routines that end after midnight', () => {
    expect(crossesMidnight('22:00', '02:00')).toBe(true);
    expect(crossesMidnight('08:00', '09:30')).toBe(false);
  });
});
