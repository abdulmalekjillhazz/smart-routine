import { describe, it, expect } from 'vitest';
import { preflightIssues } from '../../src/services/preflight.js';

const production = {
  NODE_ENV: 'production',
  CLIENT_ORIGIN: 'https://app.example.com',
  MONGODB_URI: 'mongodb+srv://user:pw@cluster.example.net/smart-routine',
  ADMIN_ENC_KEY: 'a',
  READY_TOKEN: 'b',
  SENTRY_DSN: 'https://x@sentry.example/1',
  TRAINING_SECRET: 'c',
  VAPID_PUBLIC_KEY: 'k',
  VAPID_PRIVATE_KEY: 'k',
  VAPID_SUBJECT: 'mailto:a@example.com',
  CLOUDINARY_CLOUD_NAME: 'demo',
};

const errors = (c) => preflightIssues(c).filter((i) => i.level === 'error');

describe('preflight', () => {
  it('a complete production setup has no blocking problems', () => {
    expect(errors(production)).toEqual([]);
  });

  it('blocks launch on a plain http origin in production', () => {
    expect(errors({ ...production, CLIENT_ORIGIN: 'http://app.example.com' }).length).toBe(1);
  });

  it('blocks launch on a localhost database in production', () => {
    expect(errors({ ...production, MONGODB_URI: 'mongodb://127.0.0.1:27017/x' }).length).toBe(1);
  });

  it('blocks launch when admin encryption is missing in production', () => {
    expect(errors({ ...production, ADMIN_ENC_KEY: undefined }).length).toBe(1);
  });

  it('warns, but does not block, when monitoring and push are missing', () => {
    const issues = preflightIssues({ ...production, READY_TOKEN: undefined, SENTRY_DSN: undefined, VAPID_PUBLIC_KEY: undefined, VAPID_PRIVATE_KEY: undefined, VAPID_SUBJECT: undefined });
    expect(issues.every((i) => i.level === 'warn')).toBe(true);
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });

  it('in development, a missing admin key is a warning, not an error', () => {
    const issues = preflightIssues({ NODE_ENV: 'development', CLIENT_ORIGIN: 'http://localhost:3000', MONGODB_URI: 'mongodb://127.0.0.1/x' });
    expect(issues.some((i) => i.level === 'error')).toBe(false);
  });
});
