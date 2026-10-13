import { describe, it, expect } from 'vitest';
import { bucketOf, inRollout, FLAG_DEFAULTS } from '../src/index.js';

describe('feature flags', () => {
  it('gives the same bucket every time for the same user and flag', () => {
    expect(bucketOf('lessons.quiz', 'user-1')).toBe(bucketOf('lessons.quiz', 'user-1'));
  });

  it('buckets are always 0 to 99', () => {
    for (let i = 0; i < 500; i += 1) {
      const b = bucketOf('push.reminders', `user-${i}`);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(100);
    }
  });

  it('0 percent means nobody and 100 percent means everybody', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(inRollout('x', `u${i}`, 0)).toBe(false);
      expect(inRollout('x', `u${i}`, 100)).toBe(true);
    }
  });

  it('a 10 percent rollout includes roughly 10 percent of users', () => {
    let on = 0;
    const n = 5000;
    for (let i = 0; i < n; i += 1) if (inRollout('ml.predictions', `user-${i}`, 10)) on += 1;
    const share = on / n;
    expect(share).toBeGreaterThan(0.07);
    expect(share).toBeLessThan(0.13);
  });

  it('a user who is in a 10 percent rollout is also in every larger rollout (stable staging)', () => {
    for (let i = 0; i < 500; i += 1) {
      const subject = `user-${i}`;
      if (inRollout('k', subject, 10)) expect(inRollout('k', subject, 50)).toBe(true);
    }
  });

  it('every default flag starts on for everyone', () => {
    for (const f of Object.values(FLAG_DEFAULTS)) {
      expect(f.enabled).toBe(true);
      expect(f.rolloutPercent).toBe(100);
    }
  });
});
