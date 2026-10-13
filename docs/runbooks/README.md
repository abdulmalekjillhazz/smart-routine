# Runbooks

Each runbook answers: how do I know it is broken, what do I do first, and how do I confirm it is fixed.
Keep these up to date after every incident.

| Runbook | Use it when |
|---|---|
| incident-template.md | Any outage or security event (copy it for each incident) |
| database-down.md | /api/ready returns 503, or the API logs show database errors |
| cloudinary-down.md | Admin uploads fail, or lesson images do not load |
| push-failures.md | Reminders stop, or the scheduler logs show many failed sends |
| ai-quota.md | The AI helper is unavailable (see the note inside: the helper is not yet rebuilt) |
| lost-authenticator.md | A staff member cannot pass two-factor sign-in |
| secret-exposure.md | A key, password, or database URI may have leaked |
| backup-restore.md | Monthly restore test, and recovery from data loss |
| uptime-monitoring.md | Setting up outside checks that tell you when the site is down |
