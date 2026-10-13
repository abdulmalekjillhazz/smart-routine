# Uptime monitoring (outside the app)

The app cannot tell you it is down if it is down. Use an outside service.

## Setup (any free monitor service, for example UptimeRobot or Better Stack)
1. Monitor 1: https://YOUR-API/api/health every 5 minutes. Alert if it does not return 200.
2. Monitor 2: https://YOUR-API/api/ready every 5 minutes. Alert if it returns 503.
   Optional: add the header X-Ready-Token with READY_TOKEN to see the checks. Keep the token secret.
3. Monitor 3: https://YOUR-WEB-APP/ every 5 minutes (once the web app exists).
4. Send alerts to at least two people, by two channels (for example email and SMS).

## Test it
Stop the API on the host for two minutes. You should get an alert within about ten minutes. Then start it again and confirm the all-clear.
