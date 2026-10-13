import { describe, it, expect } from 'vitest';
import { hotp, verifyTotp, base32Encode, base32Decode } from '../../src/lib/totp.js';

// RFC 6238 test vectors, SHA-1, secret "12345678901234567890" (ASCII).
const SECRET = Buffer.from('12345678901234567890', 'ascii');

describe('TOTP (RFC 6238 vectors)', () => {
  it('matches the RFC for time 59 (counter 1)', () => {
    expect(hotp(SECRET, 1)).toBe('287082');
  });
  it('matches the RFC for time 1111111109 (counter 37037036)', () => {
    expect(hotp(SECRET, 37037036)).toBe('081804');
  });
});

describe('verifyTotp', () => {
  const timeMs = 59 * 1000;
  it('accepts the current code', () => {
    expect(verifyTotp(SECRET, '287082', { timeMs, lastStep: 0 })).toBe(1);
  });
  it('blocks replay of a code whose step was already used', () => {
    expect(verifyTotp(SECRET, '287082', { timeMs, lastStep: 1 })).toBeNull();
  });
  it('rejects a wrong code', () => {
    expect(verifyTotp(SECRET, '000000', { timeMs, lastStep: 0 })).toBeNull();
  });
});

describe('base32', () => {
  it('encodes the RFC 4648 example', () => {
    expect(base32Encode(Buffer.from('f'))).toBe('MY');
  });
  it('round-trips arbitrary bytes', () => {
    const bytes = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true);
  });
});
