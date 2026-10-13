import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import webpush from 'web-push';
import { createApp } from '../../src/app.js';
import { runReminderTick } from '../../src/services/scheduler.js';
import { acquireLease } from '../../src/services/lease.js';
import { PushSubscription } from '../../src/models/PushSubscription.js';
import { ReminderLog } from '../../src/models/ReminderLog.js';
import { SchedulerLease } from '../../src/models/SchedulerLease.js';

// Needs MONGODB_URI_TEST. Wipes that database. The sender is faked, so no real push is sent.
const uri = process.env.MONGODB_URI_TEST;
const keys = webpush.generateVAPIDKeys();
const config = {
  NODE_ENV: 'test',
  PORT: 0,
  MONGODB_URI: uri || 'mongodb://127.0.0.1:1/unused',
  CLIENT_ORIGIN: 'http://localhost:3000',
  VAPID_PUBLIC_KEY: keys.publicKey,
  VAPID_PRIVATE_KEY: keys.privateKey,
  VAPID_SUBJECT: 'mailto:test@example.com',
  SCHEDULER_ENABLED: false,
};
const app = createApp({ config });
const PASSWORD = 'correct-horse-battery';
const DHAKA_0803 = new Date('2026-10-10T02:03:00Z'); // 08:03 in Dhaka

describe.skipIf(!uri)('Phase 3 integration: push and reminders', () => {
  let alice;
  let aliceCsrf;

  beforeAll(async () => {
    await mongoose.connect(uri);
    await mongoose.connection.db.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

    alice = request.agent(app);
    const c = await alice.get('/api/auth/csrf');
    const r = await alice
      .post('/api/auth/register')
      .set('X-CSRF-Token', c.body.csrfToken)
      .send({ email: 'push-alice@example.com', password: PASSWORD, displayName: 'Alice', locale: 'en', timezone: 'Asia/Dhaka' });
    aliceCsrf = r.body.csrfToken;

    await alice
      .post('/api/routines')
      .set('X-CSRF-Token', aliceCsrf)
      .send({ title: 'Morning walk', startTime: '08:00', endTime: '08:30' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('publishes the public key without login', async () => {
    const res = await request(app).get('/api/push/public-key');
    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBe(keys.publicKey);
  });

  it('stores a subscription for the logged-in user only', async () => {
    const res = await alice
      .post('/api/push/subscriptions')
      .set('X-CSRF-Token', aliceCsrf)
      .send({ endpoint: 'https://push.example.test/device-1', keys: { p256dh: 'p256dh-value-long-enough', auth: 'auth-value' } });
    expect(res.status).toBe(201);
    expect(await PushSubscription.countDocuments({ endpoint: 'https://push.example.test/device-1' })).toBe(1);
  });

  it('refuses a non-https endpoint', async () => {
    const res = await alice
      .post('/api/push/subscriptions')
      .set('X-CSRF-Token', aliceCsrf)
      .send({ endpoint: 'http://insecure.example/x', keys: { p256dh: 'p256dh-value-long-enough', auth: 'auth-value' } });
    expect(res.status).toBe(400);
  });

  it('a lease can be held by one owner at a time', async () => {
    await SchedulerLease.deleteMany({});
    const now = new Date();
    expect(await acquireLease('test-lease', 'server-a', 60000, now)).toBe(true);
    expect(await acquireLease('test-lease', 'server-b', 60000, now)).toBe(false);
  });

  it('sends a due reminder once, even when a second server ticks for the same minute', async () => {
    await SchedulerLease.deleteMany({});
    await ReminderLog.deleteMany({});
    const sender = { calls: 0 };
    const fake = async () => {
      sender.calls += 1;
    };

    const first = await runReminderTick({ now: DHAKA_0803, owner: 'server-a', sender: fake });
    expect(first.sent).toBe(1);

    // Simulate the lease having expired, so the second server really runs the tick.
    await SchedulerLease.deleteMany({});
    const second = await runReminderTick({ now: DHAKA_0803, owner: 'server-b', sender: fake });
    expect(second.sent).toBe(0);
    expect(second.suppressed).toBe(1);
    expect(sender.calls).toBe(1);
  });

  it('a reminder more than 10 minutes late is not sent', async () => {
    await SchedulerLease.deleteMany({});
    await ReminderLog.deleteMany({});
    let calls = 0;
    const late = new Date('2026-10-10T02:15:00Z'); // 08:15 in Dhaka
    const stats = await runReminderTick({ now: late, owner: 'server-c', sender: async () => { calls += 1; } });
    expect(stats.sent).toBe(0);
    expect(calls).toBe(0);
  });

  it('a gone subscription (410) is removed, so it is not retried forever', async () => {
    await SchedulerLease.deleteMany({});
    await ReminderLog.deleteMany({});
    const gone = Object.assign(new Error('gone'), { statusCode: 410 });
    await runReminderTick({ now: DHAKA_0803, owner: 'server-d', sender: async () => { throw gone; } });
    expect(await PushSubscription.countDocuments({ endpoint: 'https://push.example.test/device-1' })).toBe(0);
  });

  it('the reminder text does not contain the routine title', async () => {
    await PushSubscription.create({
      userId: (await mongoose.connection.db.collection('users').findOne({})) ._id,
      endpoint: 'https://push.example.test/device-2',
      keys: { p256dh: 'p256dh-value-long-enough', auth: 'auth-value' },
    });
    await SchedulerLease.deleteMany({});
    await ReminderLog.deleteMany({});
    let body = '';
    await runReminderTick({ now: DHAKA_0803, owner: 'server-e', sender: async (_s, b) => { body = b; } });
    expect(body).not.toContain('Morning walk');
  });
});
