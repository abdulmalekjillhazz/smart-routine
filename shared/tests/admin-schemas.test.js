import { describe, it, expect } from 'vitest';
import { roleChangeSchema, attachMediaSchema, mfaCodeSchema, auditQuerySchema } from '../src/index.js';

describe('admin schemas', () => {
  it('accepts only the four known roles', () => {
    expect(roleChangeSchema.safeParse({ role: 'editor' }).success).toBe(true);
    expect(roleChangeSchema.safeParse({ role: 'superadmin' }).success).toBe(false);
  });
  it('MFA codes are exactly six digits', () => {
    expect(mfaCodeSchema.safeParse({ code: '123456' }).success).toBe(true);
    expect(mfaCodeSchema.safeParse({ code: '12345' }).success).toBe(false);
    expect(mfaCodeSchema.safeParse({ code: 'abcdef' }).success).toBe(false);
  });
  it('a client cannot attach an arbitrary Cloudinary path', () => {
    expect(attachMediaSchema.safeParse({ publicId: 'someone-else/secret', resourceType: 'image' }).success).toBe(false);
    expect(attachMediaSchema.safeParse({ publicId: 'smart-routine/lessons/aB3dE5fG7hJ9', resourceType: 'image' }).success).toBe(true);
  });
  it('audit query limit is capped at 100', () => {
    expect(auditQuerySchema.parse({}).limit).toBe(50);
    expect(auditQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });
});
