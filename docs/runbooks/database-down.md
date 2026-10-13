# Database down

## Detect
- Uptime monitor shows /api/ready returning 503.
- Logs show: "Database connection failed" at start, or repeated server-selection errors.

## First five minutes
1. Check MongoDB Atlas status and your cluster in the Atlas console. Is it paused, out of memory, or in maintenance?
2. Check the IP allow-list in Atlas. The host's outbound address must be on it. A changed host address causes this.
3. Check the database user still exists and its password matches MONGODB_URI on the host. A rotated password causes this.
4. Restart the API after fixing the URI. It refuses to start on a bad URI and prints only the variable name.

## What users see
The app keeps working for reading cached data on the phone. Writes wait in the outbox. Nothing is lost, because operations keep their ids.

## Confirm it is fixed
- curl -s https://YOUR-API/api/ready returns {"ready":true}.
- Watch the outbox drain on a test phone: pending items become synced.

## Do not
- Do not point the app at a different database to "get it working". Data written there will not sync back.
