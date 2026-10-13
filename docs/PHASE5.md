# Phase 5: Admin (roles, two-factor, audit log, moderated uploads, cleanup)

## Built
- Roles on the user: user (learner), viewer, editor, owner. The old shared ADMIN_TOKEN is no longer used anywhere. Remove it from your host settings.
- Permissions:
  - viewer: read the audit log and the lesson list.
  - editor: create, submit, and publish lessons (not their own), sign uploads, attach or remove media.
  - owner: everything editors can do, plus change roles, archive lessons, and run the upload cleanup.
- Two-factor sign-in (TOTP, RFC 6238) for every staff account. Setup: start, confirm with a code. Secrets are encrypted at rest (AES-256-GCM with ADMIN_ENC_KEY).
- Replay protection: a six-digit code works once.
- Staff actions need a code checked in the last 12 hours on that session.
- Nobody can change their own role.
- Audit log: append-only collection. Every sensitive action writes one row (role change, lesson create, submit, publish, archive, upload signed, media attached or removed, cleanup, two-factor enabled). Summaries are short codes, never personal text.
- Uploads (Cloudinary): the server picks the file id (inside smart-routine/lessons/), signs only the allowed formats and that id, and records the upload. A 10-minute signature is not enough to attach: the file must be attached within 60 minutes.
- Attaching checks the file in Cloudinary: it must exist, be an allowed format, and be under the size limit (images 5 MB, video 50 MB). A bad file is destroyed.
- Public URL is built on the server from the cloud name. The Cloudinary public id is never shown publicly.
- Cleanup: pending uploads that were never attached, and replaced or archived media, are destroyed in Cloudinary. Files that fail to delete stay marked and are retried next run.
- Bootstrap: the first owner is set with scripts/grant-role.js from your own machine.

## Decisions and trade-offs
1. No recovery codes yet. If an owner loses their authenticator, another owner must reset two-factor, and right now that means a database change. Recovery codes are a Phase 7 runbook item. Keep at least two owners.
2. Size is checked after upload, not in the signature. Cloudinary signatures do not limit size reliably here. Set a size limit in your Cloudinary upload settings too, as a second layer.
3. The cleanup runs by hand or from cron (scripts/cleanup-uploads.js). It is not inside the scheduler yet. Schedule it hourly on the host.
4. Two-factor enrollment is limited to 5 setups per user per hour. Code checks are limited to 10 per minute.
5. Admin pages are not built. These are JSON endpoints. The web app's admin screens come with the web app.
6. Lesson authoring from the CLI (Phase 4) still works. It bypasses the audit log, so prefer the admin API.

## Endpoints (all need login; staff need two-factor and a recent code except where noted)
- POST /api/admin/mfa/setup, /mfa/confirm, /mfa/verify (staff, before two-factor is active)
- GET /api/admin/audit-log (viewer, editor, owner)
- POST /api/admin/users/:id/role (owner)
- GET and POST /api/admin/lessons; POST /lessons/:slug/submit, /publish, /archive
- POST /api/admin/uploads/signature; POST and DELETE /api/admin/lessons/:slug/media
- POST /api/admin/uploads/cleanup (owner)

## Manual checks (Git Bash)
1. Generate the encryption key: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" and put it in server/.env as ADMIN_ENC_KEY.
2. Register yourself in the app, then: npm run grant-role -w server -- you@example.com owner
3. Start the API. Call POST /api/admin/mfa/setup, add the secret to an authenticator app, then confirm.
4. Check the audit log: GET /api/admin/audit-log.

## Acceptance tests
- Unit tests: RFC 6238 test vectors, base32, encryption round-trip and tamper detection, Cloudinary signing, admin configuration checks, public media output. Pass (42 API unit tests in total).
- Integration tests (tests/integration/admin.test.js, 13 tests): learner blocked, staff need two-factor, wrong code refused, editor cannot self-publish, viewer blocked from writes but reads the audit log, owner-only role changes, signature shape, attach shows the public URL, someone else's upload refused, oversized file destroyed, replacement cleanup, expired upload cleanup, owner-only archive, 12-hour window. They need MONGODB_URI_TEST. NOT run here.

## Unverified in this sandbox
- The integration tests were not run (no MongoDB).
- Real Cloudinary behaviour was NOT tested. The tests use a fake. Check on a real account: a signed upload with the returned parameters succeeds, a wrong format is rejected by Cloudinary, and destroy removes the file. Use a test folder, not production.
- Two-factor was not tested with a real phone app. Check that your authenticator accepts the setup link and produces codes that the confirm step accepts.
