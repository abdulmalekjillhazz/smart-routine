import { hash, verify } from '@node-rs/argon2';
import { randomToken } from './crypto.js';

// Argon2id with library defaults. The stored hash records its own parameters.
export const hashPassword = (password) => hash(password);

export async function verifyPassword(stored, password) {
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}

// When an email does not exist we still run one hash check.
// This keeps response time similar, so timing does not reveal which emails are registered.
const DUMMY_HASH = await hash(randomToken(16));
export async function burnPasswordTime(password) {
  await verifyPassword(DUMMY_HASH, password);
}
