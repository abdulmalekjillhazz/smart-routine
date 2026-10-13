import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { AppError, MSG } from '../lib/AppError.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { SESSION_TTL_MS } from '../lib/cookies.js';

const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', MSG.unauthenticated);

export async function createSession(userId) {
  const token = randomToken(32);
  const csrf = randomToken(32);
  await Session.create({
    userId,
    familyId: randomToken(12),
    currentHash: sha256(token),
    previousHashes: [],
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return { token, csrf };
}

export async function revokeFamily(familyId) {
  await Session.updateMany({ familyId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllForUser(userId) {
  await Session.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function revokeSessionByToken(token) {
  if (!token) return;
  await Session.updateOne({ currentHash: sha256(token) }, { $set: { revokedAt: new Date() } });
}

// Finds the live session for a token. If the token is an old, rotated one, the whole family is revoked.
export async function loadSession(token) {
  if (!token) throw unauthenticated();
  const hash = sha256(token);
  const session = await Session.findOne({
    currentHash: hash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (session) return session;

  const reused = await Session.findOne({ previousHashes: hash, revokedAt: null }).lean();
  if (reused) await revokeFamily(reused.familyId);
  throw unauthenticated();
}

// Compare-and-swap rotation: the update only applies if the stored token is still the one we loaded.
export async function rotateSession(session) {
  const token = randomToken(32);
  const csrf = randomToken(32);
  const updated = await Session.findOneAndUpdate(
    { _id: session._id, currentHash: session.currentHash, revokedAt: null },
    {
      $set: {
        previousHashes: [session.currentHash],
        currentHash: sha256(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    },
    { new: true }
  );
  if (!updated) {
    await revokeFamily(session.familyId);
    throw unauthenticated();
  }
  return { token, csrf };
}

export async function loadUserForSession(session) {
  const user = await User.findById(session.userId).lean();
  if (!user || user.deletedAt) throw unauthenticated();
  return user;
}
