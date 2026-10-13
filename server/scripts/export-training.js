// Writes consented, pseudonymized training rows to ml/data/completions.csv. Run on your machine.
//   npm run export-training -w server
// Needs MONGODB_URI and TRAINING_SECRET (at least 32 characters) in server/.env.
import 'dotenv/config';
import fs from 'node:fs';
import mongoose from 'mongoose';
import { buildTrainingRows, toCsv } from '../src/services/mlExport.js';
import { writeAudit } from '../src/services/audit.js';

const secret = process.env.TRAINING_SECRET;
if (!secret || secret.length < 32) {
  console.error('TRAINING_SECRET is missing or shorter than 32 characters. Set it in server/.env. Nothing was exported.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Nothing was exported.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
try {
  const rows = await buildTrainingRows(secret);
  const out = new URL('../../ml/data/completions.csv', import.meta.url);
  fs.mkdirSync(new URL('.', out), { recursive: true });
  fs.writeFileSync(out, toCsv(rows));
  await writeAudit({ actor: null, action: 'ml.export', targetType: 'dataset', summary: `rows=${rows.length}` });
  console.log(`Exported ${rows.length} consented rows to ml/data/completions.csv`);
} finally {
  await mongoose.disconnect();
}
