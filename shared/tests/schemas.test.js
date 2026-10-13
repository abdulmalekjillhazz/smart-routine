import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  routineCreateSchema,
  routineUpdateSchema,
  completionSchema,
} from '../src/index.js';

describe('registerSchema', () => {
  it('rejects unknown keys', () => {
    const r = registerSchema.safeParse({
      email: 'a@example.com', password: 'long-enough-pass', displayName: 'A', role: 'admin',
    });
    expect(r.success).toBe(false);
  });
  it('rejects passwords shorter than 12 characters', () => {
    const r = registerSchema.safeParse({ email: 'a@example.com', password: 'short', displayName: 'A' });
    expect(r.success).toBe(false);
  });
  it('lowercases email and applies defaults', () => {
    const r = registerSchema.parse({ email: 'A@Example.COM', password: 'long-enough-pass', displayName: 'A' });
    expect(r.email).toBe('a@example.com');
    expect(r.timezone).toBe('Asia/Dhaka');
    expect(r.locale).toBe('bn');
  });
});

describe('routine schemas', () => {
  const base = { title: 'Read', startTime: '07:00', endTime: '07:30' };

  it('rejects a userId sent by the client (ownership comes from the session only)', () => {
    const r = routineCreateSchema.safeParse({ ...base, userId: '65f0c0ffee0000000000abcd' });
    expect(r.success).toBe(false);
  });
  it('rejects start equal to end', () => {
    expect(routineCreateSchema.safeParse({ ...base, endTime: '07:00' }).success).toBe(false);
  });
  it('accepts a midnight-crossing routine', () => {
    expect(routineCreateSchema.safeParse({ title: 'Sleep', startTime: '22:00', endTime: '02:00' }).success).toBe(true);
  });
  it('rejects an empty update', () => {
    expect(routineUpdateSchema.safeParse({}).success).toBe(false);
    expect(routineUpdateSchema.safeParse({ expectedVersion: 1 }).success).toBe(false);
  });
});

describe('completionSchema', () => {
  it('rejects an impossible date like 2026-13-45', () => {
    const r = completionSchema.safeParse({
      routineId: '65f0c0ffee0000000000abcd', date: '2026-13-45', status: 'done',
    });
    expect(r.success).toBe(false);
  });
  it('rejects unknown status values', () => {
    const r = completionSchema.safeParse({
      routineId: '65f0c0ffee0000000000abcd', date: '2026-10-10', status: 'maybe',
    });
    expect(r.success).toBe(false);
  });
});
