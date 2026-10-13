/* global __ENV */
// Load test for staging. Run with k6 (https://k6.io): k6 run -e BASE_URL=https://api-staging.example.com loadtest/k6-smoke.js
// Do NOT run against production without an announced plan.
//
// The public lesson list allows 120 requests per minute per IP address (see server/src/routes/lessons.js).
// A single test machine will hit that limit and see 429 errors. Run the load from several IP addresses,
// or raise the limit on staging only, and say which you did in the results.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:5000';

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const health = http.get(`${BASE}/api/health`);
  check(health, { 'health is 200': (r) => r.status === 200 });

  const lessons = http.get(`${BASE}/api/lessons`);
  check(lessons, { 'lessons is 200 or 429': (r) => r.status === 200 || r.status === 429 });

  const ready = http.get(`${BASE}/api/ready`);
  check(ready, { 'ready is 200 or 503': (r) => r.status === 200 || r.status === 503 });

  sleep(1);
}
