# B. Gap Analysis

| Area | Current state | Risk | Fix | Effort |
|---|---|---|---|---|
| Identity | Device id is the only credential, in localStorage | High | Accounts with argon2id, httpOnly sessions, rotation | L |
| Authorization | Queries scoped by ownerId, but id is client-supplied | High | userId from session only; cross-user tests | M |
| Admin | One shared token, no roles, no audit | High | Admin roles, audit log, rotate token now | M |
| Secrets hygiene | No .gitignore at root or in server | High | Add ignores; history secret scan | S |
| Env validation | Missing MONGODB_URI only warns; DB errors swallowed | Medium | Zod env schema; fail fast at boot | S |
| Validation | Unknown fields silently dropped; loose date regex | Medium | Shared Zod schema; reject unknown keys; real date check | M |
| Error shape | Mixed string errors | Low | One envelope with code, message, requestId | S |
| Rate limits | Assistant limit in memory, keyed by device id | High | Shared store keyed by user and IP | S |
| AI cost | Daily count only; no global cap or timeout | High | Per-user quota, monthly cap, timeout | M |
| AI prompt | User titles and questions in prompt; no visible AI notice found in client | Medium | Shorter summaries; schema check; "AI may be wrong" notice | S |
| Time logic | Server uses local time (UTC on most hosts); no user timezone | High | Store IANA timezone; one shared module; logical day | M |
| Routine model | Start and end are strings; no midnight marker | Medium | crossesMidnight field; tests for 22:00 to 02:00 | S |
| Offline sync | No write queue, no idempotency key, no version | High | Outbox, Idempotency-Key, version, last-write-wins | L |
| Service worker | API cache fallback never has data | Medium | Remove API fallback; rely on outbox | S |
| Quiz | Client calls a route that does not exist | Medium | Scoring endpoint; LessonScore | S |
| Lessons | Admin posts go live on create | Medium | Draft, review, published states | M |
| Uploads | Signature lacks type and size; any https URL accepted | High | Signed allowed_formats, folder, public_id prefix, expiry | M |
| Asset cleanup | Deleted posts leave Cloudinary assets | Medium | Asset registry and cleanup job | M |
| Notifications | Reminders only while tab open | Medium | VAPID Web Push, scheduler, de-duplication | L |
| ML data | Synthetic model; no consent; no holdout or metrics | Medium | Consent gate, holdout, metrics, versioning | L |
| ML export | No consent filter; public default salt; output folder missing | High before any real run | Consent filter; required salt; keyed HMAC | S |
| Security headers | None set | Medium | helmet; CSP for web | S |
| SEO | Client-rendered; one metadata block; no sitemap or robots | Medium | See F-seo-audit.md | M |
| Accessibility | Not audited | Medium | WCAG 2.2 AA audit; contrast check | M |
| Testing | None | High | Vitest, Supertest, Playwright | M |
| CI | None | High | GitHub Actions gates | S |
| Observability | console logging only | Medium | pino with redaction; Sentry; health routes | M |
| Backups | Not documented | High | Atlas snapshots; restore test | S |
| Dependencies | No client lockfile; lint script without ESLint config | Low | Commit lockfile; add ESLint | S |
| Docs | Client README only | Low | Root README, runbooks | S |
