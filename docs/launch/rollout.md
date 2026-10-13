# Staged rollout plan

Feature flags (shared/src/flags.js) control who sees each feature. Owners change them with POST /api/admin/flags/:key, which is audited.

## Flags that control launch
| Flag | What it turns off |
|---|---|
| lessons.quiz | Quiz attempts |
| push.reminders | Scheduled push reminders |
| ml.predictions | The miss-risk model (the app works without it) |

## Stages
| Stage | Audience | Duration | Advance only when |
|---|---|---|---|
| 0. Staff only | Staff accounts (use a 0% rollout with staff tested separately) | 1 week | No Sentry errors above the agreed level; restore test passed |
| 1. Friends and family | Invited people | 1 week | No data problems; support queue is empty or on track |
| 2. Small public | 5% of users (rolloutPercent 5) | 1 week | Error rate under 1%; readiness up 99.5%; no privacy complaints |
| 3. Wider | 25% | 1 week | Same measures, plus p95 response under 800 ms |
| 4. Full | 100% | Ongoing | Monthly review |

Commands (run on your machine with the API running):
- Set a flag: curl -X POST -H "Content-Type: application/json" -H "Cookie: ..." -H "X-CSRF-Token: ..." -d '{"enabled":true,"rolloutPercent":5}' https://api.example.com/api/admin/flags/push.reminders

## Rollback
1. Turn the affected flag to rolloutPercent 0. This takes effect on the next request.
2. If the problem is in the model, activate the previous version (npm run ml -w server -- rollback).
3. If the problem is in code, redeploy the previous release, then check readiness and error tracking.
4. Write an incident (docs/runbooks/incident-template.md).

Rollback of data is never done by hand. Use a tested restore (docs/runbooks/backup-restore.md).
