import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { AppError } from '../lib/AppError.js';
import { randomBytes } from 'node:crypto';
import { base32Encode, verifyTotp } from '../lib/totp.js';
import { encryptSecret, decryptSecret, parseKey } from '../lib/secretBox.js';

const LMSG = Object.freeze({
  unavailable: { en: 'Two-factor setup is not configured on the server.', bn: 'সার্ভারে দুই-ধাপ যাচাই সেটআপ করা নেই।' },
  notStarted: { en: 'Start two-factor setup first.', bn: 'প্রথমে দুই-ধাপ যাচাই সেটআপ শুরু করুন।' },
  alreadyOn: { en: 'Two-factor sign-in is already on.', bn: 'দুই-ধাপ যাচাই আগে থেকেই চালু আছে।' },
  notOn: { en: 'Turn on two-factor sign-in before using staff tools.', bn: 'স্টাফ টুল ব্যবহারের আগে দুই-ধাপ যাচাই চালু করুন।' },
  badCode: { en: 'The code is not correct. Try the newest code.', bn: 'কোডটি সঠিক নয়। সবচেয়ে নতুন কোডটি দিন।' },
});

function keyOrThrow(config) {
  if (!config.ADMIN_ENC_KEY) throw new AppError(503, 'UNAVAILABLE', LMSG.unavailable);
  return parseKey(config.ADMIN_ENC_KEY);
}

export async function beginSetup(userId, email, config) {
  const key = keyOrThrow(config);
  const user = await User.findById(userId).select('+mfa.secretEnc');
  if (user.mfa?.enabled) throw new AppError(409, 'CONFLICT', LMSG.alreadyOn);

  const secret = randomBytes(20);
  user.mfa = { enabled: false, secretEnc: encryptSecret(secret, key), lastStep: 0 };
  await user.save();

  const base32 = base32Encode(secret);
  return {
    secret: base32,
    otpauthUrl: `otpauth://totp/Smart%20Routine:${encodeURIComponent(email)}?secret=${base32}&issuer=Smart%20Routine`,
  };
}

export async function confirmSetup(userId, code, config) {
  const key = keyOrThrow(config);
  const user = await User.findById(userId).select('+mfa.secretEnc');
  if (user.mfa?.enabled) throw new AppError(409, 'CONFLICT', LMSG.alreadyOn);
  if (!user.mfa?.secretEnc) throw new AppError(400, 'VALIDATION_FAILED', LMSG.notStarted);

  const secret = decryptSecret(user.mfa.secretEnc, key);
  const step = verifyTotp(secret, code, { lastStep: 0 });
  if (step === null) throw new AppError(403, 'FORBIDDEN', LMSG.badCode);

  await User.updateOne({ _id: userId }, { $set: { 'mfa.enabled': true, 'mfa.lastStep': step } });
}

// Staff actions need a code checked within the last 12 hours on this session.
// The step update is atomic, so one code cannot be used twice, even by two requests at once.
export async function verifyForSession(userId, sessionId, code, config) {
  const key = keyOrThrow(config);
  const user = await User.findById(userId).select('+mfa.secretEnc');
  if (!user.mfa?.enabled) throw new AppError(403, 'FORBIDDEN', LMSG.notOn);

  const secret = decryptSecret(user.mfa.secretEnc, key);
  const step = verifyTotp(secret, code, { lastStep: user.mfa.lastStep });
  if (step === null) throw new AppError(403, 'FORBIDDEN', LMSG.badCode);

  const claimed = await User.findOneAndUpdate(
    { _id: userId, 'mfa.lastStep': { $lt: step } },
    { $set: { 'mfa.lastStep': step } }
  );
  if (!claimed) throw new AppError(403, 'FORBIDDEN', LMSG.badCode);

  await Session.updateOne({ _id: sessionId }, { $set: { mfaVerifiedAt: new Date() } });
}
