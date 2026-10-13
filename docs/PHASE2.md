# Phase 2: Reliable sync (partial: server and outbox core)

## Scope actually built
- POST /api/sync: a batch of up to 100 operations (routine.create, routine.update, routine.delete, completion.set).
- Idempotency per operation: each opId is stored (24 hours). A retry returns the stored result with status "replayed". The operation never runs twice.
- Routine create accepts an offline clientId. The server returns the existing routine for a repeated clientId.
- Conflict rule: last write wins per routine, by server arrival order. Sync edits do not use the version check. Normal PATCH keeps expectedVersion.
- Edits to a routine deleted elsewhere return "not_found". The client drops that operation and tells the user.
- Client outbox core (shared/src/outbox.js): queue, ordered flush, batching, retry on network failure without dropping, failed state for rejected operations, busy guard, exponential retry delay helper.

## Not built yet (and why)
- The IndexedDB adapter, the sync status UI, and the Playwright offline test. They need the Next.js web app (client), which is not in the repository yet. The outbox takes a store object, so the IndexedDB version drops in later without changing the logic.
- Automatic flush on the "online" event and the status display. Both belong to the web app.

## Decisions and trade-offs
1. Operation ids are sent inside each operation (plan D mentioned an Idempotency-Key header). Same protection, simpler to test and to store offline.
2. Operations in a batch run one by one, not in a transaction. A crash mid-batch is safe: the client resends the whole batch, and finished operations replay their stored results.
3. A validation error in one operation gets status "rejected" and is stored. A malformed body (for example an unknown field) refuses the whole batch with 400. This is the schema rule from Phase 1.
4. An unexpected server error releases the operation's claim, so a retry can run it again.
5. Arrival order is used for conflicts, not the device clock. Device clocks are unreliable, so this is the safer rule. The trade-off: if two devices edit one field, the one that reaches the server last wins, even if it was edited first.
6. The routine clientId index is sparse and unique per user. Routines created on the normal path have no clientId, so they are not affected.
7. Sync is rate limited to 60 batches per minute per user.

## Manual checks (Git Bash, after npm install and starting the API)
Sending the same operation twice should apply once. Replace the uuids with real ones from a generator, and set CSRF and the session cookie as in docs/PHASE1.md.

## Acceptance tests
- Shared unit tests (31) pass: sync schema, outbox behaviour (ordering, network failure, lost response, rejection, batching, busy guard, id mapping).
- Integration tests in tests/integration/sync.test.js (8 tests) cover replay, clientId dedupe, LWW, not_found, double delete, future date, all-or-nothing refusal, and cross-user isolation. They need MONGODB_URI_TEST.

## Unverified in this sandbox
- The 8 sync integration tests were NOT run (no MongoDB here). Run them with MONGODB_URI_TEST set.
- The Phase 1 integration tests are still unverified too. Sync builds on them.
- Real network behaviour: offline and flaky connections are simulated in unit tests, not on a phone.
