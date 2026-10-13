import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { loadEnv } from '../../src/config/env.js';

const base = { MONGODB_URI: 'mongodb://127.0.0.1:27017/x', CLIENT_ORIGIN: 'http://localhost:3000' };

describe('admin and Cloudinary configuration', () => {
  it('accepts a 32-byte admin key', () => {
    const cfg = loadEnv({ ...base, ADMIN_ENC_KEY: randomBytes(32).toString('base64') });
    expect(cfg.ADMIN_ENC_KEY).toBeTruthy();
  });

  it('refuses a short admin key and names the variable only', () => {
    const short = randomBytes(8).toString('base64');
    try {
      loadEnv({ ...base, ADMIN_ENC_KEY: short });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.message).toMatch(/ADMIN_ENC_KEY/);
      expect(err.message).not.toContain(short);
    }
  });

  it('refuses partial Cloudinary configuration', () => {
    expect(() => loadEnv({ ...base, CLOUDINARY_API_KEY: 'k' })).toThrow(/CLOUDINARY_CLOUD_NAME/);
  });

  it('accepts complete Cloudinary configuration', () => {
    const cfg = loadEnv({ ...base, CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' });
    expect(cfg.CLOUDINARY_CLOUD_NAME).toBe('demo');
  });
});
