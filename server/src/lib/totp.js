import crypto from 'node:crypto';
import { safeEqual } from './crypto.js';

// Two-factor codes for staff accounts. RFC 4648 (base32) and RFC 6238 (TOTP), no dependency.
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of buf) {
    value = ((value << 8) | b) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += ALPHA[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHA[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = str.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = ALPHA.indexOf(ch);
    if (idx < 0) throw new Error('invalid base32 character');
    value = ((value << 5) | idx) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function hotp(secret, counter, digits = 6) {
  const c = Buffer.alloc(8);
  c.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', secret).update(c).digest();
  const o = h[h.length - 1] & 0x0f;
  const code = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(code % 10 ** digits).padStart(digits, '0');
}

export const TOTP_STEP_SECONDS = 30;

// Returns the matching time step, or null. lastStep blocks replay of a code already used.
export function verifyTotp(secret, code, { timeMs = Date.now(), window = 1, lastStep = 0 } = {}) {
  const current = Math.floor(timeMs / 1000 / TOTP_STEP_SECONDS);
  for (let d = -window; d <= window; d += 1) {
    const step = current + d;
    if (step <= lastStep || step < 0) continue;
    if (safeEqual(hotp(secret, step), code)) return step;
  }
  return null;
}
