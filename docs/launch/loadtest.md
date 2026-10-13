# Load test procedure

Script: loadtest/k6-smoke.js (k6 is the tool; install it from https://k6.io).

## Before running
1. Staging only. Confirm the staging database is separate from production.
2. Decide how you avoid the per-IP limit (several test machines, or a staging-only limit change). Write the choice in the results.
3. Tell the team the time window.

## Run
    k6 run -e BASE_URL=https://api-staging.example.com loadtest/k6-smoke.js
Save the summary output.

## Record (fill in from the real output; never estimate)
| Date | Machines | Peak VUs | p95 ms | Error rate | Notes |
|---|---|---|---|---|---|
| | | | | | |

Thresholds: error rate under 1%, p95 under 800 ms. A failed threshold blocks launch until it is understood.

## Status
NOT RUN. The script is written. It has not been executed, because this environment has no k6 and no staging server.
