# Phase 10: Launch readiness

## Built
- Feature flags: three flags (lessons.quiz, push.reminders, ml.predictions) default on. Owners can set any flag to a rollout percentage (0 to 100). A user's place in the rollout is fixed (the same user always gets the same answer), so a rollout can grow without people flipping in and out. Changes are audited. Quizzes and reminders check their flags.
- Production preflight: npm run preflight -w server checks the configuration. Blocking errors: http origin in production, localhost database in production, missing admin encryption key in production. Warnings: monitoring, push, Cloudinary, training secret, and readiness token missing.
- Privacy policy and terms of use: full drafts in English and Bangla (docs/legal). Both are marked DRAFT and need legal review.
- Support: channel, hours, triage, and records (docs/launch/support.md). The help page shows the support email once NEXT_PUBLIC_SUPPORT_EMAIL is set.
- Staged rollout plan with stage gates and rollback steps (docs/launch/rollout.md).
- Environments: local, staging, and production kept apart (docs/launch/environments.md).
- Go and no-go checklist with an owner and date for each item (docs/launch/go-no-go.md).
- Load test script (loadtest/k6-smoke.js) and procedure (docs/launch/loadtest.md). Thresholds: under 1% errors and p95 under 800 ms.

## Verified here
- Feature flag logic (shared unit tests): deterministic buckets, 0% and 100% rollouts, roughly correct share at 10%, stable growth of a rollout.
- Preflight rules (API unit tests, 6): each blocking rule and the warnings.
- Lint clean. Full unit test suite passes.

## Decisions and trade-offs
1. Launch is blocked until CI's integration job has run green at least once. Phase 10 adds no new database evidence, so the database tests remain the largest open risk.
2. The public lesson list allows 120 requests a minute per IP. The load test has to be run from several IP addresses or with a higher staging limit, or it will measure rate limiting, not the server.
3. Feature flags are read on every request. That is simple and always current. Caching them for a few seconds is an easy later change if load shows it matters.
4. Flags default to on, so an empty flag table changes nothing. Turning a feature off needs an owner's action, which is audited.
5. The 30-day account purge runs from the scripts (npm run purge). Put it on a daily schedule on the host before launch, and check it has run.

## Not done here, and why
- The load test has NOT been run. There is no k6 and no staging server here. Results must come from a real run. Do not copy numbers from other projects.
- The privacy policy and terms have NOT been reviewed by a lawyer. They are drafts.
- The Bangla copy has NOT been reviewed by a native speaker. It stays noindex until then.
- The support email, hours, and price are placeholders. They need your decision.
- The go/no-go checklist is a template. Each item needs a named owner and a date.

## Manual checks (Git Bash)
1. Copy server/.env.example to a production-style file, fill in real values, then run: npm run preflight -w server
2. Set a flag (owner, with two-factor): see docs/launch/rollout.md.
3. Run the load test on staging (docs/launch/loadtest.md) and record the numbers.

## Acceptance tests
- Preflight unit tests: pass (run here).
- Flag rollout tests: pass (run here).
- Flag integration tests (tests/integration/flags.test.js, 4 tests): NOT run here (no MongoDB).
- Load test: NOT run.
- Rich Results, Lighthouse, lawyer review, native-speaker review: NOT run.

## Unverified in this sandbox
- Everything in "Not done here" above.
- The database tests for every phase. CI's integration job is where they must run first.
