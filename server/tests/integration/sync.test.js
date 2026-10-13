import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';

// Needs MONGODB_URI_TEST (same as the Phase 1 integration suite). Wipes that database.
const uri = process.env.MONGODB_URI_TEST;
const config = {
  NODE_ENV: 'test',
  PORT: 0,
  MONGODB_URI: uri || 'mongodb://127.0.0.1:1/unused',
  CLIENT_ORIGIN: 'http://localhost:3000',
};
const app = createApp({ config });
const PASSWORD = 'correct-horse-battery';

async function signUp(agent, email) {
  const c = await agent.get('/api/auth/csrf');
  const r = await agent
    .post('/api/auth/register')
    .set('X-CSRF-Token', c.body.csrfToken)
    .send({ email, password: PASSWORD, displayName: 'Tester', locale: 'en', timezone: 'Asia/Dhaka' });
  return r.body.csrfToken;
}

const uuid = () => globalThis.crypto.randomUUID();

describe.skipIf(!uri)('Phase 2 integration: sync', () => {
  let alice;
  let bob;
  let aliceCsrf;
  let bobCsrf;

  beforeAll(async () => {
    await mongoose.connect(uri);
    await mongoose.connection.db.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    alice = request.agent(app);
    aliceCsrf = await signUp(alice, 'sync-alice@example.com');
    bob = request.agent(app);
    bobCsrf = await signUp(bob, 'sync-bob@example.com');
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  const sync = (agent, csrf, ops) => agent.post('/api/sync').set('X-CSRF-Token', csrf).send({ ops });

  it('an offline create that is retried with the same opId is applied once', async () => {
    const opId = uuid();
    const clientId = uuid();
    const op = { opId, type: 'routine.create', data: { title: 'Walk', startTime: '06:00', endTime: '06:30', clientId } };

    const first = await sync(alice, aliceCsrf, [op]);
    expect(first.body.results[0].status).toBe('applied');

    const again = await sync(alice, aliceCsrf, [op]);
    expect(again.body.results[0].status).toBe('replayed');
    expect(again.body.results[0].routine.id).toBe(first.body.results[0].routine.id);

    const list = await alice.get('/api/routines').set('X-CSRF-Token', aliceCsrf);
    expect(list.body.routines.filter((r) => r.title === 'Walk').length).toBe(1);
  });

  it('same clientId under a new opId returns the existing routine, not a duplicate', async () => {
    const clientId = uuid();
    const a = await sync(alice, aliceCsrf, [
      { opId: uuid(), type: 'routine.create', data: { title: 'Read', startTime: '20:00', endTime: '20:30', clientId } },
    ]);
    const b = await sync(alice, aliceCsrf, [
      { opId: uuid(), type: 'routine.create', data: { title: 'Read', startTime: '20:00', endTime: '20:30', clientId } },
    ]);
    expect(b.body.results[0].routine.id).toBe(a.body.results[0].routine.id);
  });

  it('two edits to one routine in one batch: the later one wins', async () => {
    const created = await sync(alice, aliceCsrf, [
      { opId: uuid(), type: 'routine.create', data: { title: 'Draft', startTime: '09:00', endTime: '09:30' } },
    ]);
    const routineId = created.body.results[0].routine.id;
    const res = await sync(alice, aliceCsrf, [
      { opId: uuid(), type: 'routine.update', routineId, data: { title: 'First edit' } },
      { opId: uuid(), type: 'routine.update', routineId, data: { title: 'Second edit' } },
    ]);
    expect(res.body.results.map((r) => r.status)).toEqual(['applied', 'applied']);
    const list = await alice.get('/api/routines').set('X-CSRF-Token', aliceCsrf);
    expect(list.body.routines.find((r) => r.id === routineId).title).toBe('Second edit');
  });

  it('an edit to a routine that was deleted elsewhere returns not_found', async () => {
    const created = await sync(alice, aliceCsrf, [
      { opId: uuid(), type: 'routine.create', data: { title: 'Gone soon', startTime: '10:00', endTime: '10:30' } },
    ]);
    const routineId = created.body.results[0].routine.id;
    await sync(alice, aliceCsrf, [{ opId: uuid(), type: 'routine.delete', routineId }]);
    const res = await sync(alice, aliceCsrf, [
      { opId: uuid(), type: 'routine.update', routineId, data: { title: 'Too late' } },
    ]);
    expect(res.body.results[0].status).toBe('not_found');
  });

  it('deleting a routine twice is safe (both count as applied)', async () => {
    const created = await sync(alice, aliceCsrf, [
      { opId: uuid(), type: 'routine.create', data: { title: 'Twice', startTime: '11:00', endTime: '11:30' } },
    ]);
    const routineId = created.body.results[0].routine.id;
    const res = await sync(alice, aliceCsrf, [
      { opId: uuid(), type: 'routine.delete', routineId },
      { opId: uuid(), type: 'routine.delete', routineId },
    ]);
    expect(res.body.results.map((r) => r.status)).toEqual(['applied', 'applied']);
  });

  it('a future completion is rejected, and the rejection is replayed on retry', async () => {
    const created = await sync(alice, aliceCsrf, [
      { opId: uuid(), type: 'routine.create', data: { title: 'Future', startTime: '12:00', endTime: '12:30' } },
    ]);
    const routineId = created.body.results[0].routine.id;
    const op = { opId: uuid(), type: 'completion.set', data: { routineId, date: '2999-01-01', status: 'done' } };

    const first = await sync(alice, aliceCsrf, [op]);
    expect(first.body.results[0].status).toBe('rejected');
    const again = await sync(alice, aliceCsrf, [op]);
    expect(again.body.results[0].status).toBe('replayed');
  });

  it('a batch with one malformed operation is refused as a whole, with nothing applied', async () => {
    const before = await alice.get('/api/routines').set('X-CSRF-Token', aliceCsrf);
    const res = await sync(alice, aliceCsrf, [
      { opId: uuid(), type: 'routine.create', data: { title: 'Good', startTime: '13:00', endTime: '13:30' } },
      { opId: uuid(), type: 'routine.create', data: { title: 'Bad', startTime: '13:00', endTime: '13:30', userId: uuid() } },
    ]);
    expect(res.status).toBe(400);
    const after = await alice.get('/api/routines').set('X-CSRF-Token', aliceCsrf);
    expect(after.body.routines.length).toBe(before.body.routines.length);
  });

  it('Bob cannot update or delete Alice\'s routine through sync', async () => {
    const created = await sync(alice, aliceCsrf, [
      { opId: uuid(), type: 'routine.create', data: { title: 'Private', startTime: '14:00', endTime: '14:30' } },
    ]);
    const routineId = created.body.results[0].routine.id;

    const upd = await sync(bob, bobCsrf, [
      { opId: uuid(), type: 'routine.update', routineId, data: { title: 'Hacked' } },
    ]);
    expect(upd.body.results[0].status).toBe('not_found');

    const del = await sync(bob, bobCsrf, [{ opId: uuid(), type: 'routine.delete', routineId }]);
    expect(del.body.results[0].status).toBe('applied');

    const stillThere = await alice.get('/api/routines').set('X-CSRF-Token', aliceCsrf);
    expect(stillThere.body.routines.find((r) => r.id === routineId).title).toBe('Private');
  });
});
