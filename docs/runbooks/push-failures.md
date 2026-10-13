# Push reminders failing

## Detect
- Users report no reminders.
- Logs show a high count of "reminder tick finished" with failed > 0.
- Many subscriptions show growing failureCount.

## Common causes
1. VAPID keys changed. Every existing subscription becomes invalid. Users must subscribe again. Never change the keys casually.
2. The scheduler is off. Check that VAPID values are set on the host and that SCHEDULER_ENABLED is not false. The startup log says "reminder scheduler started".
3. The push service returns 410 (device gone). That is normal. Those subscriptions are removed automatically.
4. Many 5xx responses from the push service. Wait; these are usually temporary.

## First steps
1. Check the startup log for the scheduler line.
2. Check GET /api/push/public-key. If it returns unavailable, the VAPID values are missing.
3. Count failures in the logs for the last hour. A few are normal; a steady flood is not.

## Confirm it is fixed
- A test device subscribed to reminders receives a reminder at the start of a test routine.
- The next scheduler tick logs sent > 0.

## Do not
- Do not retry reminders by hand. Reminders are claimed once so people are not messaged twice.
