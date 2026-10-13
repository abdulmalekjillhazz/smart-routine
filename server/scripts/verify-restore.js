// Checks a restored copy of the database. Point it ONLY at a scratch database, never production.
//   SCRATCH_URI="mongodb://.../smart-routine-restore-test" npm run verify-restore -w server
import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.SCRATCH_URI;
if (!uri) {
  console.error('SCRATCH_URI is not set.');
  process.exit(1);
}
const dbName = new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.replace('/', '');
if (!/restore|scratch/i.test(dbName)) {
  console.error(`Refusing: the database name "${dbName}" does not look like a scratch copy. Use a name with "restore" or "scratch".`);
  process.exit(1);
}

await mongoose.connect(uri);
try {
  const db = mongoose.connection.db;
  const counts = {};
  for (const name of ['users', 'routines', 'completions', 'lessons', 'mlmodels', 'auditlogs']) {
    counts[name] = await db.collection(name).countDocuments();
  }
  const indexes = await db.collection('users').indexes();
  const hasEmailUnique = indexes.some((i) => i.key?.email === 1 && i.unique);
  console.log('Restored counts:', JSON.stringify(counts));
  console.log(`Unique email index present: ${hasEmailUnique}`);
  if (!hasEmailUnique) {
    console.error('FAILED: the users collection is missing its unique email index.');
    process.exit(1);
  }
  console.log('Restore check passed. Now delete the scratch database.');
} finally {
  await mongoose.disconnect();
}
