// Permanently removes accounts deleted more than 30 days ago. Run daily from cron or Task Scheduler.
//   npm run purge -w server
import 'dotenv/config';
import mongoose from 'mongoose';
import { writeAudit } from '../src/services/audit.js';
import { purgeDeletedAccounts } from '../src/services/purge.js';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Nothing was purged.');
  process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI);
try {
  const { purged } = await purgeDeletedAccounts();
  await writeAudit({ actor: null, action: 'account.purge', targetType: 'user', summary: `purged=${purged}` });
  console.log(`Purged ${purged} account(s) deleted more than 30 days ago.`);
} finally {
  await mongoose.disconnect();
}
