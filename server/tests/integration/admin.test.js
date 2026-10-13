import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { lessonDraftSchema } from '@smart-routine/shared';
import { createApp } from '../../src/app.js';
import { registerUser, } from '../../src/services/account.js';
import { createSession } from '../../src/services/session.js';
import { setCloudinaryClient } from '../../src/services/cloudinary.js';
import { hotp, base32Decode } from '../../src/lib/totp.js';
import { sha256 } from '../../src/lib/crypto.js';
import { User } from '../../src/models/User.js';
import { Session } from '../../src/models/Session.js';
import { Upload } from '../../src/models/Upload.js';
import { Lesson } from '../../src/models/Lesson.js';
import { AuditLog } from '../../src/models/AuditLog.js';

// Needs MONGODB_URI_TEST. Wipes that database. Cloudinary is replaced by an in-memory fake.
const uri = process.env.MONGODB_URI_TEST;
const config = {
  NODE_ENV: 'test',
  PORT: 0,
  MONGODB_URI: uri || 'mongodb://127.0.0.1:1/unused',
  CLIENT_ORIGIN: 'http://localhost:3000',
  ADMIN_ENC_KEY: randomBytes(32).toString('base64'),
  CLOUDINARY_CLOUD_NAME: 'demo',
  CLOUDINARY_API_KEY: 'key123',
  CLOUDINARY_API_SECRET: 'secret456',
};
const app = createApp({ config });
const PASSWORD = 'correct-horse-battery';
const sample = lessonDraftSchema.parse(JSON.parse(fs.readFileSync('scripts/examples/lesson-sample.json', 'utf8')));

const files = new Map(); // publicId -> { bytes, format }
const destroyed = [];
setCloudinaryClient({
  async resourceInfo(publicId) {
    return files.get(publicId) ?? null;
  },
  async destroy(publicId) {
    destroyed.push(publicId);
    return 'ok';
  },
});

// Signs a user in without the register rate limit, and returns request helpers for them.
async function actAs(user) {
  const { token, csrf } = await createSession(user._id);
  const session = await Session.findOne({ currentHash: sha256(token) }).lean();
  const cookie = `sr_session=${token}; sr_csrf=${csrf}`;
  return {
    user,
    sessionId: session._id,
    post: (url) => request(app).post(url).set('Cookie', cookie).set('X-CSRF-Token', csrf),
    get: (url) => request(app).get(url).set('Cookie', cookie),
    delete: (url) => request(app).delete(url).set('Cookie', cookie).set('X-CSRF-Token', csrf),
  };
}

// Turns on two-factor for a staff user, and leaves the session verified.
async function enrollStaff(who) {
  const setup = await who.post('/api/admin/mfa/setup');
  expect(setup.status).toBe(200);
  const secret = base32Decode(setup.body.secret);
  const step = Math.floor(Date.now() / 1000 / 30);
  const confirm = await who.post('/api/admin/mfa/confirm').send({ code: hotp(secret, step) });
  expect(confirm.status).toBe(200);
  const verify = await who.post('/api/admin/mfa/verify').send({ code: hotp(secret, step + 1) });
  expect(verify.status).toBe(200);
}

describe.skipIf(!uri)('Phase 5 integration: roles, two-factor, audit, uploads', () => {
  let owner;
  let editor;
  let viewer;
  let learner;

  beforeAll(async () => {
    await mongoose.connect(uri);
    await mongoose.connection.db.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    const base = { password: PASSWORD, locale: 'en', timezone: 'Asia/Dhaka' };
    const ownerU = await registerUser({ ...base, email: 'owner@example.com', displayName: 'Owner' });
    const editorU = await registerUser({ ...base, email: 'editor@example.com', displayName: 'Editor' });
    const viewerU = await registerUser({ ...base, email: 'viewer@example.com', displayName: 'Viewer' });
    const learnerU = await registerUser({ ...base, email: 'learner@example.com', displayName: 'Learner' });
    await User.updateOne({ _id: ownerU._id }, { $set: { role: 'owner' } });
    await User.updateOne({ _id: editorU._id }, { $set: { role: 'editor' } });
    await User.updateOne({ _id: viewerU._id }, { $set: { role: 'viewer' } });
    owner = await actAs(await User.findById(ownerU._id).lean());
    editor = await actAs(await User.findById(editorU._id).lean());
    viewer = await actAs(await User.findById(viewerU._id).lean());
    learner = await actAs(await User.findById(learnerU._id).lean());
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('a learner cannot reach any admin route', async () => {
    const res = await learner.get('/api/admin/audit-log');
    expect(res.status).toBe(403);
  });

  it('a staff user without two-factor cannot create a lesson', async () => {
    const res = await editor.post('/api/admin/lessons').send(sample);
    expect(res.status).toBe(403);
  });

  it('staff turn on two-factor, which encrypts the secret at rest', async () => {
    await enrollStaff(editor);
    await enrollStaff(owner);
    await enrollStaff(viewer);
    const stored = await User.findById(editor.user._id).select('+mfa.secretEnc').lean();
    expect(stored.mfa.secretEnc.startsWith('v1:')).toBe(true);
  });

  it('a wrong two-factor code is refused', async () => {
    const res = await editor.post('/api/admin/mfa/verify').send({ code: '000000' });
    expect(res.status).toBe(403);
  });

  it('an editor creates a lesson; the owner publishes it; the editor cannot publish their own', async () => {
    const draft = { ...sample, slug: 'admin-lesson' };
    const created = await editor.post('/api/admin/lessons').send(draft);
    expect(created.status).toBe(201);
    expect((await editor.post('/api/admin/lessons/admin-lesson/submit')).status).toBe(200);

    const selfPublish = await editor.post('/api/admin/lessons/admin-lesson/publish');
    expect(selfPublish.status).toBe(403);

    const viewerPublish = await viewer.post('/api/admin/lessons/admin-lesson/publish');
    expect(viewerPublish.status).toBe(403);

    const ownerPublish = await owner.post('/api/admin/lessons/admin-lesson/publish');
    expect(ownerPublish.status).toBe(200);
  });

  it('a viewer cannot create lessons, but can read the audit log, which shows the publish', async () => {
    expect((await viewer.post('/api/admin/lessons').send({ ...sample, slug: 'viewer-try' })).status).toBe(403);
    const log = await viewer.get('/api/admin/audit-log');
    expect(log.status).toBe(200);
    const actions = log.body.entries.map((e) => e.action);
    expect(actions).toContain('lesson.publish');
    expect(actions).toContain('lesson.create');
  });

  it('only an owner changes roles, and nobody changes their own role', async () => {
    const other = await registerUser({ password: PASSWORD, email: 'later@example.com', displayName: 'Later', locale: 'en', timezone: 'Asia/Dhaka' });
    expect((await editor.post(`/api/admin/users/${other._id}/role`).send({ role: 'viewer' })).status).toBe(403);
    expect((await owner.post(`/api/admin/users/${other._id}/role`).send({ role: 'viewer' })).status).toBe(200);
    expect((await owner.post(`/api/admin/users/${owner.user._id}/role`).send({ role: 'user' })).status).toBe(403);
  });

  it('a signed upload has a server-chosen id and only the allowed formats', async () => {
    const res = await editor.post('/api/admin/uploads/signature').send({ resourceType: 'image' });
    expect(res.status).toBe(200);
    expect(res.body.publicId.startsWith('smart-routine/lessons/')).toBe(true);
    expect(res.body.allowedFormats).toBe('jpg,png,webp');
    expect(res.body.signature).toMatch(/^[a-f0-9]{40}$/);
  });

  it('an attached image appears publicly as a server-built URL', async () => {
    const sig = await editor.post('/api/admin/uploads/signature').send({ resourceType: 'image' });
    files.set(sig.body.publicId, { bytes: 2000, format: 'jpg' });
    const res = await editor.post('/api/admin/lessons/admin-lesson/media').send({ publicId: sig.body.publicId, resourceType: 'image' });
    expect(res.status).toBe(200);
    const pub = await request(app).get('/api/lessons/admin-lesson');
    expect(pub.body.lesson.media.url).toBe(`https://res.cloudinary.com/demo/image/upload/${sig.body.publicId}`);
    expect(JSON.stringify(pub.body)).not.toContain('publicId');
  });

  it('someone else\'s upload cannot be attached', async () => {
    const sig = await owner.post('/api/admin/uploads/signature').send({ resourceType: 'image' });
    files.set(sig.body.publicId, { bytes: 2000, format: 'png' });
    const res = await editor.post('/api/admin/lessons/admin-lesson/media').send({ publicId: sig.body.publicId, resourceType: 'image' });
    expect(res.status).toBe(404);
  });

  it('an oversized file is refused and destroyed', async () => {
    const sig = await editor.post('/api/admin/uploads/signature').send({ resourceType: 'image' });
    files.set(sig.body.publicId, { bytes: 900 * 1024 * 1024, format: 'jpg' });
    const res = await editor.post('/api/admin/lessons/admin-lesson/media').send({ publicId: sig.body.publicId, resourceType: 'image' });
    expect(res.status).toBe(400);
    expect(destroyed).toContain(sig.body.publicId);
  });

  it('replacing media orphans the old file, and the cleanup job removes it', async () => {
    const before = await Lesson.findOne({ slug: 'admin-lesson' }).lean();
    const oldId = before.media.publicId;
    const sig = await editor.post('/api/admin/uploads/signature').send({ resourceType: 'image' });
    files.set(sig.body.publicId, { bytes: 3000, format: 'webp' });
    await editor.post('/api/admin/lessons/admin-lesson/media').send({ publicId: sig.body.publicId, resourceType: 'image' });
    expect((await Upload.findOne({ publicId: oldId }).lean()).status).toBe('orphaned');

    const cleaned = await owner.post('/api/admin/uploads/cleanup');
    expect(cleaned.status).toBe(200);
    expect(destroyed).toContain(oldId);
    expect((await Upload.findOne({ publicId: oldId }).lean()).status).toBe('deleted');
  });

  it('an upload that was never attached is cleaned up after its window closes', async () => {
    const stale = await Upload.create({
      publicId: 'smart-routine/lessons/neverattached01',
      resourceType: 'image',
      uploadedBy: editor.user._id,
      expiresAt: new Date(Date.now() - 1000),
    });
    await owner.post('/api/admin/uploads/cleanup');
    expect(destroyed).toContain(stale.publicId);
  });

  it('archiving is owner-only and removes the media from the public view', async () => {
    expect((await editor.post('/api/admin/lessons/admin-lesson/archive')).status).toBe(403);
    expect((await owner.post('/api/admin/lessons/admin-lesson/archive')).status).toBe(200);
    expect((await request(app).get('/api/lessons/admin-lesson')).status).toBe(404);
  });

  it('staff access expires after 12 hours without a fresh code', async () => {
    await Session.updateOne({ _id: editor.sessionId }, { $set: { mfaVerifiedAt: new Date(Date.now() - 13 * 60 * 60 * 1000) } });
    const res = await editor.post('/api/admin/lessons').send({ ...sample, slug: 'stale-session' });
    expect(res.status).toBe(403);
  });

  it('the audit log is written for each sensitive action', async () => {
    const count = await AuditLog.countDocuments({});
    expect(count).toBeGreaterThan(5);
  });
});
