# Phase 7: Observability and reliability

## Built
- Logs: one structured log per request, with a request id that also appears in error responses. Passwords, cookies, tokens, emails, routine titles, and notes are redacted. A test captures real log output and checks it.
- Error tracking (Sentry): optional. Enabled only when SENTRY_DSN is set. Events are scrubbed before sending: no query strings, bodies, headers, user details, or breadcrumbs. Error messages are replaced with the error type and code, because messages can contain user values.
- Health: /api/health (liveness, no database, returns version and uptime). /api/ready (readiness: database ping with a two-second timeout). Details (database, model, Cloudinary, push, scheduler) appear only with the X-Ready-Token header.
- Account purge: accounts deleted more than 30 days ago are removed with their routines, completions, push subscriptions, lesson scores, reminder logs, idempotency records, and sessions. Run daily with npm run purge -w server. This completes the promise made in Phase 1.
- Lost authenticator: npm run reset-mfa -w server -- <email>. Turns two-factor off, signs the person out everywhere, and audits it.
- Backup restore test: scripts/backup/restore-test.sh dumps from a read-only user, restores into a scratch database, and runs verify-restore. It refuses to restore into any database whose name does not contain "restore" or "scratch".
- Runbooks: docs/runbooks (database down, Cloudinary down, push failures, AI quota, lost authenticator, secret exposure, backup and restore, uptime monitoring, incident template).

## Decisions and trade-offs
1. Metrics (counters, latency histograms) are not built. Logs and the readiness check cover the launch need. Add a metrics endpoint when there is traffic to measure.
2. The AI habit helper from the prototype is not in this build. Its runbook is a template. It returns in a later phase with its own tests.
3. Purge removes personal data but keeps audit rows with the user id, so accountability is kept. Staff uploads keep the uploader id.
4. Sentry is optional so the app runs without it. Turn it on only after the scrubbing test passes on your account (see below).
5. The restore script needs MongoDB Database Tools on your machine. It is written for Git Bash on Windows, but it has not been run here.

## Manual checks (Git Bash)
1. Health: curl -s http://localhost:5000/api/health
2. Readiness: curl -s http://localhost:5000/api/ready
3. Readiness details: curl -s -H "X-Ready-Token: YOUR_TOKEN" http://localhost:5000/api/ready
4. Purge preview: nothing is deleted without a deleted account older than 30 days. Test with a seeded old account on a test database first.
5. Restore test: follow docs/runbooks/backup-restore.md.

## Acceptance tests
- Unit (run here, pass): redaction keeps secrets and personal text out of log output, error scrubbing removes user data and query strings, nested sensitive keys are redacted, request ids appear in headers and error bodies, liveness reports version without a database, readiness hides details without a database, purge window is 30 days.
- Integration (tests/integration/ops.test.js, 4 tests): readiness details need the token, a wrong token gets no details, purge removes only old deleted accounts and their routines, purge removes sessions. NOT run here (no MongoDB).
- Script check (run here): the restore script has valid Bash syntax. Its behaviour was NOT run.

## Unverified in this sandbox
- Sentry was not sent a real event (no DSN). Check on your Sentry project: trigger a test error, then confirm the event has no query string, cookie, or email.
- The database integration tests were not run.
- The restore script was not run against real MongoDB tools.
- Uptime monitors and alerts were not set up. Follow docs/runbooks/uptime-monitoring.md.
