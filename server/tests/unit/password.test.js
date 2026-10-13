import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';

describe('password hashing', () => {
  it('stores an argon2 hash, never the plain password', async () => {
    const stored = await hashPassword('correct-horse-battery');
    expect(stored).toMatch(/^\$argon2id\$/);
    expect(stored).not.toContain('correct-horse-battery');
  });

  it('verifies the right password and rejects the wrong one', async () => {
    const stored = await hashPassword('correct-horse-battery');
    expect(await verifyPassword(stored, 'correct-horse-battery')).toBe(true);
    expect(await verifyPassword(stored, 'wrong-password-value')).toBe(false);
  });

  it('returns false instead of throwing for a corrupt stored hash', async () => {
    expect(await verifyPassword('not-a-hash', 'anything')).toBe(false);
  });
});
