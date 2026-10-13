import { describe, it, expect } from 'vitest';
import { Writable } from 'node:stream';
import { createLogger, scrubHeaders } from '../../src/lib/logger.js';

function capture() {
  const chunks = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  return { logger: createLogger(stream, { level: 'info' }), text: () => chunks.join('') };
}

const SECRETS = {
  'x-ready-token': 'READY-SECRET-VALUE-1234567890-abcdef',
  'x-csrf-token': 'CSRF-SECRET-VALUE-0001',
  'x-api-key': 'APIKEY-SECRET-VALUE-0002',
  'x-webhook-secret': 'HOOK-SECRET-VALUE-0003',
  cookie: 'sr_session=COOKIE-SECRET-VALUE-0004',
  authorization: 'Bearer AUTH-SECRET-VALUE-0005',
};

describe('secret headers never reach a log line', () => {
  it('the real logger writes none of the secret header values', () => {
    const { logger, text } = capture();
    logger.info({ req: { headers: { ...SECRETS, 'user-agent': 'harmless-agent' } } }, 'request');
    const out = text();
    for (const value of Object.values(SECRETS)) expect(out).not.toContain(value);
    expect(out).toContain('harmless-agent');
  });

  it('a header ending in token or secret is redacted, even with a name not in the fixed list', () => {
    const cleaned = scrubHeaders({ 'x-new-service-token': 'NEW-TOKEN-VALUE', accept: 'text/html' });
    expect(cleaned['x-new-service-token']).toBe('[REDACTED]');
    expect(cleaned.accept).toBe('text/html');
  });
});
