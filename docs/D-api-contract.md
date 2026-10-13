# D. API Contract

Conventions
- Error envelope: { "error": { "code", "message", "requestId", "fields?" } }. Messages are bilingual.
- Bodies validated by one Zod schema. Unknown keys return VALIDATION_FAILED.
- Session cookies: httpOnly, Secure, SameSite=Lax. State-changing requests need X-CSRF-Token matching a cookie, plus an Origin check.
- Retryable writes send Idempotency-Key. The response is stored for 24 hours.
- Rate limits per user and per IP from a shared store.

Common codes: VALIDATION_FAILED (400), UNAUTHENTICATED (401), FORBIDDEN (403), CSRF_FAILED (403), NOT_FOUND (404), CONFLICT (409), RATE_LIMITED (429), AI_UNAVAILABLE (503), INTERNAL (500).

| Method and path | Auth | Request | Response | Specific errors | Rate limit |
|---|---|---|---|---|---|
| GET /api/health | None | none | { ok } only | none | IP generous |
| GET /api/ready | Internal token | none | DB and model status | UNAUTHENTICATED | Internal |
| POST /api/auth/register | None | email, password (min 12), displayName, locale, timezone | { user } and session | Duplicate email returns generic success | IP 5 per hour |
| POST /api/auth/login | None | email, password | { user } and session | UNAUTHENTICATED (generic) | IP 10 per 15 min; account 5 per 15 min with backoff |
| POST /api/auth/logout | Session | none | { ok }; session revoked | none | User 30 per min |
| POST /api/auth/refresh | Refresh cookie | none | New cookies; family revoked on reuse | UNAUTHENTICATED | IP 30 per min |
| GET /api/me | Session | none | { user } | UNAUTHENTICATED | User 60 per min |
| PATCH /api/me | Session | displayName, locale, timezone | { user } | VALIDATION_FAILED | User 20 per min |
| GET /api/me/export | Session plus password | password | JSON file, streamed | FORBIDDEN | User 1 per day |
| DELETE /api/me | Session plus password | password | { ok, purgeAfter } | FORBIDDEN | User 2 per day |
| PUT /api/me/consents/model-training | Session | granted, version | { consent } | VALIDATION_FAILED | User 10 per min |
| GET /api/routines?date= | Session | date | { routines, completions } | VALIDATION_FAILED | User 60 per min |
| POST /api/routines | Session | clientId, title, startTime, endTime, category, priority, note, isFrog | { routine } 201 | VALIDATION_FAILED; duplicate clientId returns existing | User 60 per min |
| PATCH /api/routines/:id | Session | editable fields, expectedVersion | { routine } | NOT_FOUND (also for others), CONFLICT | User 60 per min |
| DELETE /api/routines/:id | Session | none | { ok }; completions removed in transaction | NOT_FOUND | User 30 per min |
| PUT /api/completions | Session | routineId, date, status, clientUpdatedAt | { completion } | NOT_FOUND, VALIDATION_FAILED | User 120 per min |
| POST /api/sync | Session | ops (max 100), each with Idempotency-Key | { results } | Per-op errors | User 20 per min |
| GET /api/lessons | None | locale, cursor | { lessons } published, no answers | none | IP 120 per min |
| GET /api/lessons/:slug | None | none | { lesson } without answers | NOT_FOUND | IP 120 per min |
| POST /api/lessons/:id/attempts | Session | answers | { score, total, feedback } | NOT_FOUND, VALIDATION_FAILED | User 10 per min |
| POST /api/assistant/questions | Session | question (max 500) | { answer, remaining, disclaimer } | RATE_LIMITED, AI_UNAVAILABLE | User 20 per day; IP 60 per hour; global cap |
| POST /api/push/subscriptions | Session | endpoint, keys | { ok } | VALIDATION_FAILED | User 10 per min |
| DELETE /api/push/subscriptions | Session | endpoint | { ok } | NOT_FOUND | User 10 per min |
| GET /api/model/current | None | none | version, features, coefficients, metrics, sha256 | NOT_FOUND | IP 60 per min; CDN cached |
| POST /api/admin/auth/login | None | email, password, 2FA code | { admin } and admin session | UNAUTHENTICATED (generic) | IP 5 per 15 min |
| GET /api/admin/upload-signature | Admin editor | folder, resourceType | Signed params (allowed_formats, max bytes, public_id prefix, expiry) | FORBIDDEN | Admin 30 per hour |
| POST /api/admin/lessons | Admin editor | full draft | { lesson } as draft | VALIDATION_FAILED | Admin 60 per hour |
| PATCH /api/admin/lessons/:id | Admin editor | fields, expectedVersion | { lesson } | CONFLICT, NOT_FOUND | Admin 60 per hour |
| POST /api/admin/lessons/:id/publish | Admin (second reviewer) | none | { lesson } published | FORBIDDEN (no self-approval) | Admin 20 per hour |
| POST /api/admin/notifications/drafts | Admin editor | intent, language | Draft only | AI_UNAVAILABLE | Admin 10 per hour |
| POST /api/admin/notifications/:id/send | Admin owner | none | { queued } | FORBIDDEN, CONFLICT | Admin 5 per hour |
| DELETE /api/admin/lessons/:id | Admin owner | none | { ok }; asset marked for cleanup | NOT_FOUND | Admin 20 per hour |
| GET /api/admin/audit-log | Admin owner or viewer | cursor, filters | { entries } | FORBIDDEN | Admin 60 per hour |
| POST /api/admin/ml/export | Admin owner | none | Job id; private file | FORBIDDEN | Admin 2 per day |
