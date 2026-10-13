import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

const base = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/x',
  CLIENT_ORIGIN: 'http://localhost:3000',
};

describe('push configuration in env', () => {
  it('works with no VAPID keys (push is optional)', () => {
    const cfg = loadEnv(base);
    expect(cfg.VAPID_PUBLIC_KEY).toBeUndefined();
    expect(cfg.SCHEDULER_ENABLED).toBe(true);
  });

  it('refuses partial VAPID configuration and names the variable, not the value', () => {
    const secret = 'PRIVATE-KEY-VALUE-SHOULD-NOT-APPEAR';
    expect(() => loadEnv({ ...base, VAPID_PRIVATE_KEY: secret })).toThrow(/VAPID_PUBLIC_KEY/);
    try {
      loadEnv({ ...base, VAPID_PRIVATE_KEY: secret });
    } catch (err) {
      expect(err.message).not.toContain(secret);
    }
  });

  it('turns the scheduler off with SCHEDULER_ENABLED=false', () => {
    expect(loadEnv({ ...base, SCHEDULER_ENABLED: 'false' }).SCHEDULER_ENABLED).toBe(false);
  });
});
