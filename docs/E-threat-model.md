# E. Threat Model (Top 10)

| # | Threat | Where it applies | Mitigation | Phase |
|---|---|---|---|---|
| 1 | Account takeover | Device id in localStorage is a full credential; Math.random fallback is guessable | argon2id; httpOnly sessions; refresh rotation with reuse detection; generic errors; lockout with backoff; admin 2FA | 1 |
| 2 | IDOR on routines and completions | Scope value is a client header | userId from session only; every query filters by userId; cross-user tests return 404 | 1 |
| 3 | Admin token leak | One long-lived token typed in browser | Rotate now; named admin accounts with roles; short admin sessions; audit log | 1 (rotate), 5 |
| 4 | Prompt injection via titles, notes, questions | Titles go into Gemini prompt; output shown to user | AI has read-only data and no write tools; titles reduced to labels; output schema check; plain-text rendering; no ids or secrets in prompt | 1, 3 |
| 5 | Upload abuse | Signature covers only folder and timestamp | Signed allowed_formats, folder, public_id prefix; short expiry; size limit enforced in Cloudinary and checked after upload (verify live) | 5 |
| 6 | Data export by others | Future export link could be guessed or shared | Export only after password re-entry; streamed; no public URL; once a day; audit entry | 1 |
| 7 | Cloudinary URL tampering | Admin can store any https URL | Store publicId only; server builds URL from configured cloud name; verify asset exists before publish | 5 |
| 8 | AI cost abuse | Quota per device id in memory; new id bypasses it | Per-user and per-IP quotas in Mongo; monthly global cap with kill switch; timeout; token cap; spend alerts | 1, 3 |
| 9 | Cron replay or duplicate reminders | No scheduler yet; restarts or multiple instances | reminderLog unique key; lease with leaseUntil; skip reminders older than 10 minutes | 3 |
| 10 | PII in logs | Error handler logs full error objects; AI errors include prompt text | pino redaction (authorization, cookie, password, token, question, title, note); HMAC user ids in logs; Sentry scrubbing | 7 |
