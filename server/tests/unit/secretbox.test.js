import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { encryptSecret, decryptSecret, parseKey } from '../../src/lib/secretBox.js';

const key = parseKey(randomBytes(32).toString('base64'));

describe('secretBox', () => {
  it('round-trips a secret', () => {
    const secret = randomBytes(20);
    const stored = encryptSecret(secret, key);
    expect(decryptSecret(stored, key).equals(secret)).toBe(true);
  });

  it('never stores the plain secret', () => {
    const secret = Buffer.from('plain-secret-bytes-here');
    const stored = encryptSecret(secret, key);
    expect(stored).not.toContain(secret.toString('base64'));
  });

  it('refuses a changed ciphertext', () => {
    const stored = encryptSecret(randomBytes(20), key);
    const parts = stored.split(':');
    const flipped = Buffer.from(parts[3], 'base64');
    flipped[0] ^= 0xff;
    parts[3] = flipped.toString('base64');
    expect(() => decryptSecret(parts.join(':'), key)).toThrow();
  });

  it('refuses the wrong key', () => {
    const stored = encryptSecret(randomBytes(20), key);
    const other = parseKey(randomBytes(32).toString('base64'));
    expect(() => decryptSecret(stored, other)).toThrow();
  });

  it('rejects a key that is not 32 bytes', () => {
    expect(() => parseKey(randomBytes(16).toString('base64'))).toThrow(/32 bytes/);
  });
});
