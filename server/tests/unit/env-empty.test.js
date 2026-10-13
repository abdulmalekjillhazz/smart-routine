import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

const good = {
  NODE_ENV: 'development',
  PORT: '5000',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/x',
  CLIENT_ORIGIN: 'http://localhost:3000',
};

// Mirrors server/.env.example with every optional value left empty.
const copiedExample = {
  ...good,
  VAPID_PUBLIC_KEY: '',
  VAPID_PRIVATE_KEY: '',
  VAPID_SUBJECT: '',
  ADMIN_ENC_KEY: '',
  SENTRY_DSN: '',
  READY_TOKEN: '',
  TRAINING_SECRET: '',
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: '',
};

describe('loadEnv with empty optional values', () => {
  it('a copied example with empty optional values boots', () => {
    expect(() => loadEnv(copiedExample)).not.toThrow();
  });

  it('empty optional values behave as unset, so the scheduler default still applies', () => {
    expect(loadEnv(copiedExample).SCHEDULER_ENABLED).toBe(true);
  });

  it('an empty required value is still refused and named', () => {
    expect(() => loadEnv({ ...copiedExample, MONGODB_URI: '' })).toThrow(/MONGODB_URI/);
  });
});

describe('CLIENT_ORIGIN normalisation', () => {
  it('a trailing slash is removed, so the CSRF origin check matches the browser', () => {
    expect(loadEnv({ ...good, CLIENT_ORIGIN: 'http://localhost:3000/' }).CLIENT_ORIGIN).toBe('http://localhost:3000');
  });

  it('several trailing slashes are removed too', () => {
    expect(loadEnv({ ...good, CLIENT_ORIGIN: 'https://example.com//' }).CLIENT_ORIGIN).toBe('https://example.com');
  });

  it('a path is refused and the variable is named', () => {
    expect(() => loadEnv({ ...good, CLIENT_ORIGIN: 'https://example.com/app' })).toThrow(/CLIENT_ORIGIN/);
  });

  it('a query string is refused', () => {
    expect(() => loadEnv({ ...good, CLIENT_ORIGIN: 'https://example.com/?x=1' })).toThrow(/CLIENT_ORIGIN/);
  });
});
