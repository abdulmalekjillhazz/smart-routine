import { describe, it, expect } from 'vitest';
import { randomToken, sha256, safeEqual } from '../../src/lib/crypto.js';

describe('crypto helpers', () => {
  it('makes unique, url-safe tokens', () => {
    const a = randomToken(32);
    const b = randomToken(32);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(42);
  });

  it('hashes with SHA-256 (known test vector)', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('compares secrets safely', () => {
    expect(safeEqual('same-token', 'same-token')).toBe(true);
    expect(safeEqual('same-token', 'other-token')).toBe(false);
    expect(safeEqual('short', 'much-longer-value')).toBe(false);
    expect(safeEqual(undefined, 'x')).toBe(false);
  });
});
