import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Writable } from 'node:stream';
import { createLogger } from '../../src/lib/logger.js';
import { scrubEvent, scrubDeep } from '../../src/lib/sentry.js';
import { purgeCutoff, PURGE_AFTER_DAYS } from '../../src/services/purge.js';
import { createApp } from '../../src/app.js';

// Captures everything the logger writes, so the test can check what a log line would contain.
function captureLogs() {
  const chunks = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  return { logger: createLogger(stream, { level: 'info' }), text: () => chunks.join('') };
}

describe('log redaction', () => {
  it('never writes a password, cookie, token, email, or routine title', () => {
    const { logger, text } = captureLogs();
    logger.info(
      {
        password: 'hunter2-long-enough',
        email: 'secret.person@example.com',
        req: { headers: { cookie: 'sr_session=TOPSECRETVALUE', authorization: 'Bearer ABCDEF' } },
        body: { title: 'Private routine name', note: 'private note text' },
      },
      'request handled'
    );
    const out = text();
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('secret.person@example.com');
    expect(out).not.toContain('TOPSECRETVALUE');
    expect(out).not.toContain('ABCDEF');
    expect(out).not.toContain('Private routine name');
    expect(out).not.toContain('private note text');
    expect(out).toContain('[REDACTED]');
  });

  it('keeps ordinary fields such as the request id', () => {
    const { logger, text } = captureLogs();
    logger.info({ requestId: 'req-123', errCode: 11000 }, 'error');
    expect(text()).toContain('req-123');
  });
});

describe('error tracking scrubbing', () => {
  it('keeps only the method and path of a request', () => {
    const event = scrubEvent({
      request: { method: 'POST', url: '/api/auth/login?email=a@b.com', data: { password: 'x' }, headers: { cookie: 'c' } },
      user: { email: 'a@b.com' },
      breadcrumbs: [{ message: 'secret' }],
    });
    expect(event.request).toEqual({ method: 'POST', url: '/api/auth/login' });
    expect(event.user).toBeUndefined();
    expect(event.breadcrumbs).toBeUndefined();
    expect(JSON.stringify(event)).not.toContain('a@b.com');
  });

  it('redacts sensitive keys deep inside extra data', () => {
    const out = scrubDeep({ outer: { password: 'p', safe: 'ok', nested: { token: 't' } } });
    expect(out).toEqual({ outer: { password: '[REDACTED]', safe: 'ok', nested: { token: '[REDACTED]' } } });
  });
});

describe('request ids and health', () => {
  const app = createApp({
    config: { NODE_ENV: 'test', PORT: 0, MONGODB_URI: 'mongodb://127.0.0.1:1/x', CLIENT_ORIGIN: 'http://localhost:3000' },
  });

  it('every response carries a request id, and error bodies repeat it', async () => {
    const res = await request(app).get('/nothing-here');
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('liveness reports a version and needs no database', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('uptimeSec');
  });

  it('readiness without a database returns 503 and no details', async () => {
    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ ready: false });
  });
});

describe('account purge window', () => {
  it('is 30 days before now', () => {
    const now = new Date('2026-10-10T00:00:00Z');
    const cutoff = purgeCutoff(now);
    expect(now.getTime() - cutoff.getTime()).toBe(PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  });
});
