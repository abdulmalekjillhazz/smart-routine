import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../src/app.js';
import { registerUser } from '../../src/services/account.js';
import { buildTrainingRows, pseudonymize } from '../../src/services/mlExport.js';
import { importArtifact, activate, rollback, activeModel } from '../../src/services/mlRegistry.js';
import { User } from '../../src/models/User.js';
import { Routine } from '../../src/models/Routine.js';
import { Completion } from '../../src/models/Completion.js';
import { TRAINING_CONSENT_VERSION } from '@smart-routine/shared';

// Needs MONGODB_URI_TEST. Wipes that database.
const uri = process.env.MONGODB_URI_TEST;
const config = { NODE_ENV: 'test', PORT: 0, MONGODB_URI: uri || 'mongodb://127.0.0.1:1/unused', CLIENT_ORIGIN: 'http://localhost:3000' };
const app = createApp({ config });
const SECRET = 'training-secret-for-tests-0123456789';
// Resolved from this file, so the test works from any working directory.
const DEMO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../ml/artifacts');

// Each artifact needs a unique version. Copy the demo artifact with a new version name for each test.
function artifactWithVersion(demoFile, version, status = 'candidate') {
  const a = JSON.parse(fs.readFileSync(`${DEMO}/${demoFile}`, 'utf8'));
  a.version = version;
  a.status = status;
  a.decision = { status, reasons: [] };
  const bytes = Buffer.from(JSON.stringify(a, null, 2));
  return { bytes, sha: crypto.createHash('sha256').update(bytes).digest('hex') };
}

describe.skipIf(!uri)('Phase 6 integration: export, registry, serving', () => {
  let consenting;
  let withdrawn;
  let notConsented;
  let deleted;
  let demoFile;

  beforeAll(async () => {
    demoFile = fs.readdirSync(DEMO).find((f) => f.startsWith('synthetic-v') && f.endsWith('.json'));
    await mongoose.connect(uri);
    await mongoose.connection.db.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

    const base = { password: 'correct-horse-battery', locale: 'en', timezone: 'Asia/Dhaka' };
    const consent = { granted: true, version: TRAINING_CONSENT_VERSION, updatedAt: new Date() };
    consenting = await registerUser({ ...base, email: 'yes@example.com', displayName: 'Yes' });
    withdrawn = await registerUser({ ...base, email: 'withdrawn@example.com', displayName: 'Withdrawn' });
    notConsented = await registerUser({ ...base, email: 'no@example.com', displayName: 'No' });
    deleted = await registerUser({ ...base, email: 'gone@example.com', displayName: 'Gone' });
    await User.updateOne({ _id: consenting._id }, { $set: { 'consents.modelTraining': consent } });
    await User.updateOne({ _id: withdrawn._id }, { $set: { 'consents.modelTraining': { ...consent, granted: false } } });
    await User.updateOne({ _id: deleted._id }, { $set: { 'consents.modelTraining': consent, deletedAt: new Date() } });

    for (const u of [consenting, withdrawn, notConsented, deleted]) {
      const r = await Routine.create({ userId: u._id, title: `Secret title ${u.email}`, startTime: '07:00', endTime: '07:30', priority: 'low' });
      await Completion.create({ userId: u._id, routineId: r._id, date: '2026-10-09', status: 'missed' });
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('exports only consenting, non-deleted users, pseudonymized, with no titles or ids', async () => {
    const rows = await buildTrainingRows(SECRET);
    expect(rows.length).toBe(1);
    expect(rows[0].user_hash).toBe(pseudonymize(SECRET, String(consenting._id)));
    const text = JSON.stringify(rows);
    expect(text).not.toContain('Secret title');
    expect(text).not.toContain(String(consenting._id));
  });

  it('a synthetic model is refused for activation', async () => {
    const { bytes, sha } = artifactWithVersion(demoFile, 'synthetic-test-1', 'synthetic');
    await importArtifact(bytes, sha);
    await expect(activate('synthetic-test-1')).rejects.toMatchObject({ status: 403 });
  });

  it('a tampered artifact is refused at import', async () => {
    const { bytes } = artifactWithVersion(demoFile, 'tampered-1');
    await expect(importArtifact(bytes, 'f'.repeat(64))).rejects.toMatchObject({ status: 400 });
  });

  it('activating a candidate makes it public; rollback returns to the previous one', async () => {
    const a = artifactWithVersion(demoFile, 'candidate-a');
    await importArtifact(a.bytes, a.sha);
    await activate('candidate-a');
    expect((await request(app).get('/api/model/current')).body.version).toBe('candidate-a');

    const b = artifactWithVersion(demoFile, 'candidate-b');
    await importArtifact(b.bytes, b.sha);
    await activate('candidate-b');
    expect((await activeModel()).version).toBe('candidate-b');

    await rollback();
    expect((await activeModel()).version).toBe('candidate-a');
  });

  it('the public model endpoint sends an ETag and answers 304 when it matches', async () => {
    const first = await request(app).get('/api/model/current');
    expect(first.status).toBe(200);
    expect(first.body.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(first.body)).not.toContain('userId');
    const again = await request(app).get('/api/model/current').set('If-None-Match', first.headers.etag);
    expect(again.status).toBe(304);
  });

  it('only one model can be active at a time (enforced by the database)', async () => {
    const active = await activeModel();
    const count = await mongoose.connection.db.collection('mlmodels').countDocuments({ status: 'active' });
    expect(count).toBe(1);
    expect(active).toBeTruthy();
  });
});
