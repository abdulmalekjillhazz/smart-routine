import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { registerUser } from '../../src/services/account.js';
import { purgeDeletedAccounts } from '../../src/services/purge.js';
import { User } from '../../src/models/User.js';
import { Routine } from '../../src/models/Routine.js';
import { Session } from '../../src/models/Session.js';

// Needs MONGODB_URI_TEST. Wipes that database.
const uri = process.env.MONGODB_URI_TEST;
const READY_TOKEN = randomBytes(24).toString('hex');
const config = {
  NODE_ENV: 'test',
  PORT: 0,
  MONGODB_URI: uri || 'mongodb://127.0.0.1:1/unused',
  CLIENT_ORIGIN: 'http://localhost:3000',
  READY_TOKEN,
};
const app = createApp({ config });
const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!uri)('Phase 7 integration: readiness and purge', () => {
  let oldUser;
  let recentUser;

  beforeAll(async () => {
    await mongoose.connect(uri);
    await mongoose.connection.db.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    const base = { password: 'correct-horse-battery', locale: 'en', timezone: 'Asia/Dhaka' };
    oldUser = await registerUser({ ...base, email: 'old-deleted@example.com', displayName: 'Old' });
    recentUser = await registerUser({ ...base, email: 'recent-deleted@example.com', displayName: 'Recent' });
    await Routine.create({ userId: oldUser._id, title: 'Old routine', startTime: '07:00', endTime: '07:30' });
    await Routine.create({ userId: recentUser._id, title: 'Recent routine', startTime: '07:00', endTime: '07:30' });
    await User.updateOne({ _id: oldUser._id }, { $set: { deletedAt: new Date(Date.now() - 31 * DAY) } });
    await User.updateOne({ _id: recentUser._id }, { $set: { deletedAt: new Date(Date.now() - 5 * DAY) } });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('readiness with the database up shows details only to a caller with the token', async () => {
    const plain = await request(app).get('/api/ready');
    expect(plain.status).toBe(200);
    expect(plain.body).toEqual({ ready: true });

    const withToken = await request(app).get('/api/ready').set('X-Ready-Token', READY_TOKEN);
    expect(withToken.body.checks.database).toBe('ok');
    expect(withToken.body.checks.model).toBe('none');
  });

  it('a wrong readiness token gets no details', async () => {
    const res = await request(app).get('/api/ready').set('X-Ready-Token', 'wrong');
    expect(res.body).toEqual({ ready: true });
  });

  it('purge removes only accounts deleted more than 30 days ago, with their routines', async () => {
    const result = await purgeDeletedAccounts();
    expect(result.purged).toBe(1);
    expect(await User.exists({ _id: oldUser._id })).toBeNull();
    expect(await Routine.exists({ userId: oldUser._id })).toBeNull();
    expect(await User.exists({ _id: recentUser._id })).not.toBeNull();
    expect(await Routine.exists({ userId: recentUser._id })).not.toBeNull();
  });

  it('purge removes sessions too (none left for a purged account)', async () => {
    expect(await Session.countDocuments({ userId: oldUser._id })).toBe(0);
  });
});
