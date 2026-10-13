# Phase 3: Time and reminders (server side)

## Built
- Time module additions: minutesInZone (minute of day in a user's timezone).
- Reminder rule as a pure function (shared/src/reminders.js). The same function will run in the web app for the in-app fallback, so both sides agree.
- Rule: a reminder fires only in the first 10 minutes after a routine starts. Anything later is stale and is never sent.
- Midnight: a routine starting at 23:58 is still reminded at 00:03, and it belongs to the previous day.
- A routine already marked for that day gets no reminder.
- Web Push subscriptions: POST and DELETE /api/push/subscriptions. The public key is at GET /api/push/public-key.
- Scheduler: runs once a minute. It checks every subscribed user, applies the rule above, and sends.
- Duplicate protection: each reminder (user, routine, date, kind) is claimed in the database before sending. A second server gets a duplicate-key error and skips it.
- Lease: only one server runs a tick at a time. If that server dies, the lease expires after 55 seconds.
- Gone devices: a 404 or 410 from the push service removes that subscription.
- Privacy: the push text is generic ("A routine starts now"). The routine title is not sent to the push service.
- Push is optional. Without VAPID keys the app runs normally, and the reminder endpoints return "unavailable".

## Trade-offs
1. A reminder is claimed before it is sent. If the send then fails, it is not retried. A missed reminder is better than a duplicate.
2. Reminder dates use "now minus 24 hours" to find yesterday. This is exact for Asia/Dhaka (no daylight saving time). In a zone that changes clocks, this can be off by an hour around the change. Acceptable for now; noted for later.
3. The lease uses the database clock passed in by the caller. Two servers with badly skewed clocks could both act. The duplicate-key claim still prevents double sends.
4. The scheduler checks every subscribed user on every tick. Fine for hundreds of users. For many thousands, it needs an index on routine start times (Phase 7 scaling).
5. In-app fallback (the reminder shown while the tab is open) and the service-worker push handler are not built. Both need the web app.

## Manual checks (Git Bash)
1. Generate VAPID keys once: npx web-push generate-vapid-keys
2. Put the three VAPID values in server/.env (all three, or none).
3. Start the API. The log should say "reminder scheduler started".
4. curl -s http://localhost:5000/api/push/public-key should return your public key.
5. Without VAPID keys, the same URL should return UNAVAILABLE, and the log should say reminders are off.

## Acceptance tests
- Shared unit tests (reminder rule, minute of day, timezone change, midnight wrap, completed routine): pass.
- API unit tests (VAPID env checks, partial config refused, scheduler off switch): pass.
- Integration tests (tests/integration/push.test.js, 8 tests): subscribe, https-only, lease, exactly-once across two servers, stale reminder not sent, 410 removal, generic text. They need MONGODB_URI_TEST. NOT run here.

## Unverified in this sandbox
- The push integration tests were not run (no MongoDB).
- No real push message was sent. The sender was faked in every test. Real delivery needs a real browser subscription, tested on a real phone.
- The in-app fallback and the service-worker push listener are not built (need client).
