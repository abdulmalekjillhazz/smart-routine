# AI helper unavailable or over quota

Note: the AI habit helper from the prototype is not part of this build yet. It is planned to return with its own tests. Until it does, this runbook is a template to use when it returns.

## Detect
- The helper returns "unavailable", or the daily quota is hit for many users.
- Google Cloud billing shows a sudden increase.

## First steps
1. Check Google Cloud billing and quota. Look for a spike in requests.
2. Lower the global monthly cap, or switch the helper off with its feature flag, while you investigate.
3. Check for abuse: many requests from one user or one IP. Block that user with a role change or a session revoke, not by deleting data.

## Confirm it is fixed
- The helper answers a test question. The daily per-user limit still applies.
- The monthly spend is under the cap.

## Do not
- Do not raise the cap without knowing the cause of the spike.
