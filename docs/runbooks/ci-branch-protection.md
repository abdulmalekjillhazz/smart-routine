# Make CI block merges (one-time setup in GitHub)

Code alone cannot block a merge. GitHub must be told which checks are required.

1. On GitHub, open the repository, then Settings, then Branches.
2. Add a branch protection rule for main.
3. Tick "Require status checks to pass before merging".
4. Add these checks as required: quality, integration, ml, security. Add web-budgets once client exists.
5. Tick "Require branches to be up to date before merging".
6. Tick "Do not allow bypassing the above settings", including for administrators.

## Check it works
Open a test pull request that breaks a test on purpose (for example, change an expected value). The merge button must stay disabled until the test passes again. Close the pull request without merging.

## Coverage floors
The unit job fails when coverage drops below the floor in server/vitest.unit.config.js and shared/vitest.config.js. To check the gate, run cd server, then npx vitest run -c vitest.unit.config.js --coverage --coverage.thresholds.lines=99. It must fail with exit code 1.
