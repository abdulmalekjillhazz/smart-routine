// Recovery for a lost authenticator. Run on your own machine, as an owner.
//   npm run reset-mfa -w server -- staff@example.com
// Turns two-factor off for that person, signs them out everywhere, and writes an audit row.
// They must sign in again and set up two-factor before using staff tools.
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { writeAudit } from '../src/services/audit.js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: npm run reset-mfa -w server -- <email>');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
try {
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) {
    console.error('No active user with that email. Nothing was changed.');
    process.exit(1);
  }
  await User.updateOne({ _id: user._id }, { $set: { 'mfa.enabled': false, 'mfa.lastStep': 0 }, $unset: { 'mfa.secretEnc': 1 } });
  await Session.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await writeAudit({ actor: null, action: 'mfa.reset', targetType: 'user', targetId: user._id, summary: `role=${user.role}` });
  console.log('Two-factor reset. All sessions for that person were signed out.');
} finally {
  await mongoose.disconnect();
}
