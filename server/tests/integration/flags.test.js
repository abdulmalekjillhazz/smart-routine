import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { registerUser } from '../../src/services/account.js';
import { createSession } from '../../src/services/session.js';
import { isEnabledFor, setFlag } from '../../src/services/flags.js';
import { User } from '../../src/models/User.js';
import { Session } from '../../src/models/Session.js';
import { sha256 } from '../../src/lib/crypto.js';

// Needs MONGODB_URI_TEST. Wipes that database.
const uri = process.env.MONGODB_URI_TEST;
const config = { NODE_ENV: 'test', PORT: 0, MONGODB_URI: uri || 'mongodb://127.0.0.1:1/unused', CLIENT_ORIGIN: 'http://localhost:3000' };
const app = createApp({ config });

describe.skipIf(!uri)('Phase 10 integration: feature flags', () => {
  let owner;
  let learner;
  let learnerCookie;

  beforeAll(async () => {
    await mongoose.connect(uri);
    await mongoose.connection.db.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    const base = { password: 'correct-horse-battery', locale: 'en', timezone: 'Asia/Dhaka' };
    owner = await registerUser({ ...base, email: 'flag-owner@example.com', displayName: 'Owner' });
    await User.updateOne({ _id: owner._id }, { $set: { role: 'owner' } });
    const l = await registerUser({ ...base, email: 'flag-learner@example.com', displayName: 'Learner' });
    learner = l;
    const { token, csrf } = await createSession(l._id);
    learnerCookie = `sr_session=${token}; sr_csrf=${csrf}`;
    expect(await Session.exists({ currentHash: sha256(token) })).not.toBeNull();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('with no stored change, every default flag is on for a learner', async () => {
    expect(await isEnabledFor('lessons.quiz', learner._id)).toBe(true);
    const res = await request(app).get('/api/flags').set('Cookie', learnerCookie);
    expect(res.status).toBe(200);
    expect(res.body.flags['lessons.quiz']).toBe(true);
  });

  it('a 0 percent rollout turns a feature off for everyone', async () => {
    await setFlag('lessons.quiz', { enabled: true, rolloutPercent: 0 }, owner._id);
    expect(await isEnabledFor('lessons.quiz', learner._id)).toBe(false);
    await setFlag('lessons.quiz', { enabled: true, rolloutPercent: 100 }, owner._id);
  });

  it('only owners can change a flag', async () => {
    const { token, csrf } = await createSession(learner._id);
    const res = await request(app)
      .post('/api/admin/flags/lessons.quiz')
      .set('Cookie', `sr_session=${token}; sr_csrf=${csrf}`)
      .set('X-CSRF-Token', csrf)
      .send({ enabled: false, rolloutPercent: 0 });
    expect(res.status).toBe(403);
  });

  it('an unknown flag key is refused', async () => {
    const res = await request(app).post('/api/admin/flags/not.a.flag').send({ enabled: true, rolloutPercent: 50 });
    expect([403, 404]).toContain(res.status);
  });
});
