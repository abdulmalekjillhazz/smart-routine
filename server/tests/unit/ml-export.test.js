import { describe, it, expect } from 'vitest';
import { pseudonymize, weekdayOf, toCsv } from '../../src/services/mlExport.js';
import { verifyArtifactHash } from '../../src/services/mlRegistry.js';
import crypto from 'node:crypto';

const SECRET = 'a'.repeat(40);

describe('training export helpers', () => {
  it('pseudonyms are stable for one secret and differ across secrets', () => {
    expect(pseudonymize(SECRET, 'user-1')).toBe(pseudonymize(SECRET, 'user-1'));
    expect(pseudonymize(SECRET, 'user-1')).not.toBe(pseudonymize('b'.repeat(40), 'user-1'));
    expect(pseudonymize(SECRET, 'user-1')).toMatch(/^[0-9a-f]{16}$/);
  });

  it('refuses a short or missing secret', () => {
    expect(() => pseudonymize('short', 'u')).toThrow(/32 characters/);
    expect(() => pseudonymize(undefined, 'u')).toThrow(/32 characters/);
  });

  it('computes the weekday of a calendar date (Sunday = 0)', () => {
    expect(weekdayOf('2026-10-10')).toBe(6); // Saturday
    expect(weekdayOf('2026-10-11')).toBe(0); // Sunday
  });

  it('CSV has only the agreed columns and no free text', () => {
    const csv = toCsv([{ user_hash: 'abc', day: '2026-10-10', start_hour: 7, duration_min: 30, weekday: 6, priority: 'low', missed: 1 }]);
    expect(csv.split('\n')[0]).toBe('user_hash,day,start_hour,duration_min,weekday,priority,missed');
    expect(csv).toContain('abc,2026-10-10,7,30,6,low,1');
  });
});

describe('artifact hash check', () => {
  it('accepts a file whose hash matches its sidecar', () => {
    const bytes = Buffer.from('{"version":"x"}');
    const sha = crypto.createHash('sha256').update(bytes).digest('hex');
    expect(verifyArtifactHash(bytes, `${sha}\n`)).toBe(sha);
  });
  it('refuses a changed file', () => {
    const sha = crypto.createHash('sha256').update(Buffer.from('original')).digest('hex');
    expect(() => verifyArtifactHash(Buffer.from('tampered'), sha)).toThrow(/does not match/);
  });
});
