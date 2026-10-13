// Model registry on your machine. Import, activate, roll back, list.
//   npm run ml -w server -- import ml/artifacts/<version>.json
//   npm run ml -w server -- activate <version>
//   npm run ml -w server -- rollback
//   npm run ml -w server -- list
import 'dotenv/config';
import fs from 'node:fs';
import mongoose from 'mongoose';
import { MlModel } from '../src/models/MlModel.js';
import { importArtifact, activate, rollback } from '../src/services/mlRegistry.js';
import { writeAudit } from '../src/services/audit.js';
import { AppError } from '../src/lib/AppError.js';

const [, , command, target] = process.argv;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!process.env.MONGODB_URI) fail('MONGODB_URI is not set. Check server/.env.');
await mongoose.connect(process.env.MONGODB_URI);
try {
  if (command === 'import') {
    if (!target) fail('Usage: import <artifact.json>  (the .sha256 file must sit next to it)');
    const bytes = fs.readFileSync(target);
    const sidecar = fs.readFileSync(target.replace(/\.json$/, '.sha256'), 'utf8');
    const doc = await importArtifact(bytes, sidecar);
    await writeAudit({ actor: null, action: 'ml.import', targetType: 'model', targetId: doc._id, summary: `version=${doc.version},status=${doc.status}` });
    console.log(`Imported ${doc.version} (${doc.status}). AUC ${doc.metrics.auc.toFixed(3)}, Brier ${doc.metrics.brier.toFixed(4)}.`);
  } else if (command === 'activate') {
    if (!target) fail('Usage: activate <version>');
    const doc = await activate(target);
    await writeAudit({ actor: null, action: 'ml.activate', targetType: 'model', targetId: doc._id, summary: `version=${doc.version}` });
    console.log(`Active model is now ${doc.version}.`);
  } else if (command === 'rollback') {
    const doc = await rollback();
    await writeAudit({ actor: null, action: 'ml.rollback', targetType: 'model', targetId: doc._id, summary: `version=${doc.version}` });
    console.log(`Rolled back. Active model is now ${doc.version}.`);
  } else if (command === 'list') {
    for (const m of await MlModel.find({}).sort({ createdAt: -1 }).lean()) {
      console.log(`${m.status.padEnd(10)} ${m.version}  AUC ${m.metrics.auc.toFixed(3)}`);
    }
  } else {
    fail('Commands: import <file> | activate <version> | rollback | list');
  }
} catch (err) {
  if (err instanceof AppError) fail(err.i18n.en);
  throw err;
} finally {
  await mongoose.disconnect();
}
