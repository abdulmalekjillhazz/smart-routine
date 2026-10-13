import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';

// Needs a real MongoDB. Set MONGODB_URI_TEST in server/.env (see .env.example).
// This database is wiped at the start of the run. Never point it at production.
const uri = process.env.MONGODB_URI_TEST;
const config = {
  NODE_ENV: 'test',
  PORT: 0,
  MONGODB_URI: uri || 'mongodb://127.0.0.1:1/unused',
  CLIENT_ORIGIN: 'http://localhost:3000',
};
const app = createApp({ config });

const PASSWORD = 'correct-horse-battery';

// The CSRF token is returned in each auth response, so tests can echo it back in a header.
async function signUp(agent, email, displayName) {
  const res = await agent.get('/api/auth/csrf');
  const register = await agent
    .post('/api/auth/register')
    .set('X-CSRF-Token', res.body.csrfToken)
    .send({ email, password: PASSWORD, displayName, locale: 'en', timezone: 'Asia/Dhaka' });
  return {
    status: register.status,
    body: register.body,
    csrf: register.body.csrfToken,
    token: setCookieValue(register, 'sr_session'),
  };
}

function setCookieValue(res, name) {
  const header = (res.headers['set-cookie'] || []).find((c) => c.startsWith(`${name}=`));
  return header ? header.split(';')[0].slice(name.length + 1) : null;
}

describe.skipIf(!uri)('Phase 1 integration: accounts and isolation', () => {
  let alice;
  let bob;
  let aliceCsrf;
  let bobCsrf;
  let aliceRoutineId;

  beforeAll(async () => {
    await mongoose.connect(uri);
    await mongoose.connection.db.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('registers two users and sets httpOnly session cookies', async () => {
    alice = request.agent(app);
    const a = await signUp(alice, 'alice@example.com', 'Alice');
    expect(a.status).toBe(201);
    expect(a.body.user.passwordHash).toBeUndefined();
    aliceCsrf = a.csrf;

    bob = request.agent(app);
    const b = await signUp(bob, 'bob@example.com', 'Bob');
    expect(b.status).toBe(201);
    bobCsrf = b.csrf;
  });

  it('refuses a duplicate email with a clear 409', async () => {
    const other = request.agent(app);
    const again = await signUp(other, 'alice@example.com', 'Alice Again');
    expect(again.status).toBe(409);
  });

  it('refuses a write without the CSRF header', async () => {
    const res = await alice.post('/api/routines').send({ title: 'x', startTime: '07:00', endTime: '07:30' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_FAILED');
  });

  it('Alice creates a midnight-crossing routine', async () => {
    const res = await alice
      .post('/api/routines')
      .set('X-CSRF-Token', aliceCsrf)
      .send({ title: 'Wind down', startTime: '22:00', endTime: '02:00' });
    expect(res.status).toBe(201);
    expect(res.body.routine.crossesMidnight).toBe(true);
    aliceRoutineId = res.body.routine.id;
  });

  it('refuses unknown fields such as a client-sent userId', async () => {
    const res = await alice
      .post('/api/routines')
      .set('X-CSRF-Token', aliceCsrf)
      .send({ title: 'Sneaky', startTime: '07:00', endTime: '07:30', userId: '65f0c0ffee0000000000abcd' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('IDOR: Bob cannot list, change, delete, or mark Alice\'s routine', async () => {
    const list = await bob.get('/api/routines');
    expect(list.body.routines.find((r) => r.id === aliceRoutineId)).toBeUndefined();

    const patch = await bob
      .patch(`/api/routines/${aliceRoutineId}`)
      .set('X-CSRF-Token', bobCsrf)
      .send({ title: 'Hacked' });
    expect(patch.status).toBe(404);

    const del = await bob.delete(`/api/routines/${aliceRoutineId}`).set('X-CSRF-Token', bobCsrf);
    expect(del.status).toBe(404);

    const mark = await bob
      .put('/api/completions')
      .set('X-CSRF-Token', bobCsrf)
      .send({ routineId: aliceRoutineId, date: '2020-01-01', status: 'done' });
    expect(mark.status).toBe(404);

    const stillThere = await alice.get('/api/routines');
    expect(stillThere.body.routines.find((r) => r.id === aliceRoutineId).title).toBe('Wind down');
  });

  it('refuses a future completion date (judged in the user timezone)', async () => {
    const res = await alice
      .put('/api/completions')
      .set('X-CSRF-Token', aliceCsrf)
      .send({ routineId: aliceRoutineId, date: '2999-01-01', status: 'done' });
    expect(res.status).toBe(400);
  });

  it('refuses an impossible calendar date', async () => {
    const res = await alice
      .put('/api/completions')
      .set('X-CSRF-Token', aliceCsrf)
      .send({ routineId: aliceRoutineId, date: '2026-13-45', status: 'done' });
    expect(res.status).toBe(400);
  });

  it('stale expectedVersion returns 409', async () => {
    const res = await alice
      .patch(`/api/routines/${aliceRoutineId}`)
      .set('X-CSRF-Token', aliceCsrf)
      .send({ title: 'Wind down v2', expectedVersion: 99 });
    expect(res.status).toBe(409);
  });

  it('a wrong password returns a generic 401, and repeated failures are rate limited', async () => {
    const carol = request.agent(app);
    await signUp(carol, 'carol@example.com', 'Carol');
    const t = (await carol.get('/api/auth/csrf')).body.csrfToken;
    let last;
    for (let i = 0; i < 6; i += 1) {
      last = await carol
        .post('/api/auth/login')
        .set('X-CSRF-Token', t)
        .send({ email: 'carol@example.com', password: 'wrong-password-value' });
    }
    expect(last.status).toBe(429);
  });

  it('refresh rotates the session, and reusing the old token revokes the family', async () => {
    const dave = request.agent(app);
    const sign = await signUp(dave, 'dave@example.com', 'Dave');
    const oldToken = sign.token;
    const first = await dave.post('/api/auth/refresh').set('X-CSRF-Token', sign.csrf);
    expect(first.status).toBe(200);
    const newToken = setCookieValue(first, 'sr_session');
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(oldToken);

    // Reuse the token from before the rotation. This must fail and revoke everything.
    const reused = await request(app).get('/api/me').set('Cookie', `sr_session=${oldToken}`);
    expect(reused.status).toBe(401);

    const stillValid = await request(app).get('/api/me').set('Cookie', `sr_session=${newToken}`);
    expect(stillValid.status).toBe(401);
  });

  it('export needs the password, and a wrong password is refused', async () => {
    const res = await alice
      .post('/api/me/export')
      .set('X-CSRF-Token', aliceCsrf)
      .send({ password: 'wrong-password-value' });
    expect(res.status).toBe(403);
  });

  it('export with the right password includes Alice\'s data and no password hash', async () => {
    const res = await alice
      .post('/api/me/export')
      .set('X-CSRF-Token', aliceCsrf)
      .send({ password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.routines.length).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('deleting the account blocks further login', async () => {
    const del = await bob.delete('/api/me').set('X-CSRF-Token', bobCsrf).send({ password: PASSWORD });
    expect(del.status).toBe(200);

    const attempt = await request(app)
      .post('/api/auth/login')
      .set('X-CSRF-Token', 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
      .set('Cookie', 'sr_csrf=eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
      .send({ email: 'bob@example.com', password: PASSWORD });
    expect(attempt.status).toBe(401);
  });
});
