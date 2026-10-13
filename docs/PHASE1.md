# Phase 1: Accounts, sessions, authorization, validation, env checks

## What is built
- Register, login, logout, refresh (session rotation), profile, consent, export, delete.
- Every routine and completion query filters by the session user. The user id is never read from the body or a header.
- Shared Zod schemas in shared. Unknown keys are rejected.
- Fail-fast boot: missing or malformed variables stop the process and name the variable, never its value.
- Rate limits (per IP, per account, per user) stored in MongoDB with TTL, keyed by hashes.
- CSRF double-submit cookie plus Origin check on every state-changing request.
- Argon2id password hashing. Generic login errors and a dummy hash check for unknown emails.

## Decisions and known trade-offs (read these)
1. Duplicate email on register returns 409 with a message. This reveals whether an email is registered. It is limited to 5 registrations per IP per hour. Email verification (Phase 10) will replace this with a generic response.
2. Sessions use one opaque token that rotates on each /api/auth/refresh call. The plan mentioned separate access and refresh tokens. One rotating token gives the same reuse detection with fewer moving parts.
3. Reuse detection covers the last rotation only. An old token from two or more rotations ago looks like an ordinary invalid session.
4. Two tabs refreshing at the same moment can look like reuse. The second tab is logged out. Phase 2 should queue refresh calls on the client.
5. Routine delete removes completions in a second step, not in one transaction. A crash between the two leaves harmless orphaned completions that no query returns. A transaction needs a replica set, which is not required in Phase 1.
6. Account deletion marks the account and revokes sessions. The 30-day purge of data is a Phase 7 job.
7. Anonymous device data from the prototype is not migrated. The default assumption is a clean start. Migration is not run.
8. The old prototype routes (posts, assistant, admin, device id) are removed from this build. They return in their own phases: lessons in Phase 4, the assistant in Phase 3, admin in Phase 5.
9. Health check returns {ok:true} only. Readiness with database status is Phase 7.

## Manual checklist (Git Bash, after npm install)
1. Copy server/.env.example to server/.env and set real local values.
2. Start MongoDB locally, for example: docker run -d -p 27017:27017 --name sr-mongo mongo:7
3. Run the tests: npm test (unit tests run without MongoDB; integration tests run only if MONGODB_URI_TEST is set).
4. Start the API: npm run dev -w server
5. Get a CSRF token and register a user (replace the email):
   CSRF=$(curl -s -c cj.txt http://localhost:5000/api/auth/csrf | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).csrfToken")
   curl -s -b cj.txt -c cj.txt -H "Content-Type: application/json" -H "X-CSRF-Token: $CSRF" -H "Origin: http://localhost:3000" -d '{"email":"me@example.com","password":"correct-horse-battery","displayName":"Me","locale":"en","timezone":"Asia/Dhaka"}' http://localhost:5000/api/auth/register
6. Check that a missing token is refused: curl -s -X POST -H "Content-Type: application/json" -d '{}' http://localhost:5000/api/auth/login  (expect CSRF_FAILED)

## Acceptance tests
- Unit tests pass without a database (shared 14, api 15).
- Integration tests pass against a real MongoDB (14 tests in tests/integration/isolation.test.js). These need MONGODB_URI_TEST.
- The IDOR test proves another user receives 404 for every routine and completion operation.

## Unverified in this sandbox
- The integration suite was NOT run. The sandbox cannot reach a MongoDB server. Run it with MONGODB_URI_TEST set. Expect small fixes if a test assumption is wrong.
- @node-rs/argon2 was loaded on Linux. The Windows prebuilt binary is expected to work but was not tested here. If npm install fails on Windows, check the error and report it.
- Cookie behaviour across real domains (app and api subdomains) and HTTPS (Secure cookies) was not tested.
