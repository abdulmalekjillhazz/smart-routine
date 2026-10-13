import crypto from 'node:crypto';

// AES-256-GCM. A stolen database alone does not reveal the two-factor secrets.
export function parseKey(base64) {
  const key = Buffer.from(base64, 'base64');
  if (key.length !== 32) throw new Error('encryption key must be 32 bytes');
  return key;
}

export function encryptSecret(plain, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

// Throws if the data was changed or the key is wrong. Never returns partial data.
export function decryptSecret(stored, key) {
  const [version, iv, tag, ct] = stored.split(':');
  if (version !== 'v1') throw new Error('unknown secret format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]);
}
