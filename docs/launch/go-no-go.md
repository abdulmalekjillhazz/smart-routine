# Go / no-go checklist (every item must be checked, with a name and date)

## Code and tests
- [ ] CI is green on main: quality, integration, ml, security, seo jobs. Integration tests have run and passed at least once. Owner: ____ Date: ____
- [ ] Branch protection requires those checks (docs/runbooks/ci-branch-protection.md). Owner: ____
- [ ] Lighthouse budgets pass on the deployed web app. Owner: ____
- [ ] Rich Results Test passes on the home page and one lesson page. Owner: ____

## Security
- [ ] The old prototype ADMIN_TOKEN is removed from every host. Owner: ____
- [ ] Git history checked for secrets (docs/runbooks/secret-exposure.md). Owner: ____
- [ ] Two owners exist, each with two-factor sign-in on. Owner: ____
- [ ] npm run preflight -w server shows no FAIL lines. Owner: ____
- [ ] A penetration or security review has been done, or the risk is accepted in writing. Owner: ____

## Data and operations
- [ ] Atlas continuous backup on, and a restore test passed (docs/runbooks/backup-restore.md). Owner: ____
- [ ] Account deletion tested end to end on staging, including the 30-day purge. Owner: ____
- [ ] Export tested on staging. Owner: ____
- [ ] Uptime monitors set on /api/health, /api/ready, and the web app (docs/runbooks/uptime-monitoring.md). Owner: ____
- [ ] Sentry receives a test error with no personal data. Owner: ____

## Legal and content
- [ ] Privacy policy reviewed by a lawyer, in both languages. Owner: ____
- [ ] Terms of use reviewed by a lawyer, in both languages. Owner: ____
- [ ] Bangla copy reviewed by a native speaker. Then set SEO_BN_INDEXABLE=true. Owner: ____
- [ ] Support email and hours published on the help page (docs/launch/support.md). Owner: ____
- [ ] Price stated on the site is confirmed (structured data says 0 BDT). Owner: ____

## Performance
- [ ] Load test run on staging with the script in loadtest/. Results recorded below, not estimated. Owner: ____
- [ ] Real low-end Android phone tested on a slow connection. Owner: ____

## Model
- [ ] Either no model is active (the app works without it), or a model passed the release rule with at least 200 consented completions. Owner: ____

## Decision
Go / no-go: ____   Name: ____   Date: ____
