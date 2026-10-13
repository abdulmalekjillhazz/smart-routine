import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { signParams } from '../../src/services/cloudinary.js';

describe('Cloudinary signing', () => {
  const params = { public_id: 'smart-routine/lessons/abc', timestamp: 1700000000, allowed_formats: 'jpg,png,webp' };
  const secret = 'test-secret';

  it('matches a manual SHA-1 over sorted key=value pairs plus the secret', () => {
    const text = 'allowed_formats=jpg,png,webp&public_id=smart-routine/lessons/abc&timestamp=1700000000';
    const expected = crypto.createHash('sha1').update(text + secret).digest('hex');
    expect(signParams(params, secret)).toBe(expected);
  });

  it('ignores the order the keys were given in', () => {
    const reordered = { timestamp: 1700000000, allowed_formats: 'jpg,png,webp', public_id: 'smart-routine/lessons/abc' };
    expect(signParams(reordered, secret)).toBe(signParams(params, secret));
  });

  it('changes if an allowed format is changed (so a client cannot widen it)', () => {
    expect(signParams({ ...params, allowed_formats: 'exe' }, secret)).not.toBe(signParams(params, secret));
  });
});
