# Phase 8: Quality gates

## Built
- Lint: ESLint 9 flat config for the server and shared code. Clean. It found nine real unused-variable errors from earlier phases, which are now fixed.
- Unit tests: 110 pass here (54 shared, 56 API unit). CI runs them on every pull request.
- Coverage floors: API unit 30 percent lines (measured 34), shared 80 percent (measured 98). The floors fail the build when coverage drops below them. The gate was checked: an impossible floor makes the command exit with 1.
- Integration tests in CI: a MongoDB 7 service container runs the 64 database tests on every pull request. This is the first time they run automatically. Until they run, all database behaviour is unverified.
- ML: Python unit tests and the Python-to-JavaScript parity test run in their own job.
- Dependency audit: fails on high or critical vulnerabilities in production code, and on high or critical in all code. Test tools were upgraded to vitest 5 to remove critical advisories found in vitest 2.
- Performance budgets: lighthouserc.json with LCP, CLS, TBT, and category score floors, enforced only once client exists. docs/budgets/performance-budget.md lists the numbers.
- Branch protection: docs/runbooks/ci-branch-protection.md. This is a GitHub setting, not code. Until it is set, a failing check does not block a merge.

## Decisions and trade-offs
1. The coverage floor measures unit tests only, because the unit job cannot start a database. The full picture comes from the integration job, which the floor does not yet measure. A combined coverage job is a later improvement.
2. Moderate audit findings remain in the Sentry package, through OpenTelemetry. They are not high or critical, so they do not block. Re-check them after each Sentry upgrade.
3. Lighthouse and bundle budgets are wired but inactive until client exists. Phase 8 cannot test them. Phase 9 is where they first run for real.
4. Upgrading vitest to 5 changed no test code, but it is a major upgrade, so the full suite was rerun after it: lint clean, 110 unit tests pass.

## Acceptance tests
- "CI blocks a merge that breaks a budget": demonstrated for the coverage budget. An impossible floor exits 1. The pull-request block itself depends on the GitHub setting in docs/runbooks/ci-branch-protection.md, and I could not test that here.
- Lint: clean (run here).
- Unit tests: 110 pass (run here).
- Dependency audit at high: passes (run here).

## Unverified in this sandbox
- The GitHub workflow has NOT run. Push this to GitHub and read the first run. Expect to fix something: the integration job is the first time the 64 database tests run anywhere.
- The branch protection rule must be set by you on GitHub.
- Lighthouse budgets have not run (no web app).
