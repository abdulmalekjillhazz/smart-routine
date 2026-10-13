// Bootstrap tool for the first owner, run on your own machine.
//   node scripts/grant-role.js you@example.com owner
// It writes an audit entry with actor "cli". After that, owners change roles through the admin API.
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';

const [, , email, role] = process.argv;
const ROLES = ['user', 'viewer', 'editor', 'owner'];

if (!email || !ROLES.includes(role)) {
  console.error('Usage: node scripts/grant-role.js <email> <user|viewer|editor|owner>');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Check server/.env.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const user = await User.findOneAndUpdate({ email: email.toLowerCase(), deletedAt: null }, { $set: { role } }, { new: true });
if (!user) {
  console.error(`No active user with email ${email}. Register it in the app first.`);
  await mongoose.disconnect();
  process.exit(1);
}
await AuditLog.create({ actorId: null, actorRole: 'cli', action: 'role.change', targetType: 'user', targetId: String(user._id), summary: `role=${role}` });
console.log(`Role set to ${role}. Next: sign in, then turn on two-factor sign-in.`);
await mongoose.disconnect();
