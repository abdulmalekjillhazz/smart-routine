# Smart Routine

A daily routine planner and habit coach. Bangla and English. Works in a browser on a PC, laptop, or phone, and can be installed to the home screen.

The project has three separate parts. The server and the client run as separate programs and talk over HTTP. The shared folder holds code both sides can use.

## Folder map

```
smart-routine/
├── server/                 SERVER: Express API, MongoDB, sessions, sync, push, admin
│   ├── src/
│   │   ├── index.js        starts the server (connects to MongoDB, then listens)
│   │   ├── app.js          builds the Express app (middleware, routes)
│   │   ├── config/         env.js: reads and checks environment variables
│   │   ├── routes/         HTTP endpoints, one file per area
│   │   ├── services/       business logic (sync, scheduler, push, lessons, uploads)
│   │   ├── models/         MongoDB schemas (Mongoose)
│   │   ├── middleware/     auth, CSRF, rate limits, roles, error handling
│   │   └── lib/            logger (secrets redacted), crypto, cookies, Sentry
│   ├── scripts/            admin tools: grant-role, purge, preflight, export-training
│   ├── tests/
│   │   ├── unit/           fast tests, no database
│   │   └── integration/    tests against a real MongoDB (CI runs these)
│   ├── .env.example        copy to server/.env and fill in
│   └── package.json
│
├── client/                 CLIENT: Next.js website and app shell
│   ├── app/
│   │   ├── (public)/[lang]/  public pages: home, lessons, about, help, privacy, terms
│   │   ├── (private)/app/    the signed-in app (screens are being built)
│   │   ├── globals.css
│   │   ├── robots.js, sitemap.js
│   ├── components/         Header, Footer, MobileMenu, JsonLd
│   ├── lib/                api.js (reads the server), seo.js, palette.js
│   ├── i18n/               dictionaries.js: all English and Bangla copy
│   ├── public/             icon.svg and other static files
│   ├── scripts/            contrast check, SEO check
│   ├── tests/              unit tests and tests/e2e (Playwright, browser tests)
│   ├── .env.example        copy to client/.env.local and fill in
│   └── package.json
│
├── shared/                 SHARED: code used by server and client
│   ├── src/
│   │   ├── schemas/        validation rules (zod) for requests
│   │   ├── time.js         "Now" and "Next" from the time module
│   │   ├── outbox.js       offline queue (retries, refusals, sync)
│   │   ├── reminders.js    which reminders are due
│   │   ├── flags.js, ml.js, quiz.js, errors.js
│   └── tests/
│
├── ml/                     OFFLINE: Python pipeline for model training (not run by the server)
├── docs/                   phase notes, runbooks, release notes, SEO audit
├── loadtest/               k6 smoke test
├── scripts/backup/         restore test
├── .github/workflows/      CI: lint, unit, integration, ML, security, SEO, budgets
├── eslint.config.js        lint rules for server, client, and shared
├── lighthouserc.json       performance budgets
├── package.json            npm workspaces: server, client, shared
└── package-lock.json       one lockfile for all three
```

## Quick start (Windows, Git Bash)

```bash
cd ~/smart-routine
npm install
npm run test:unit        # server, shared, and client unit tests (no database needed)
npm run lint
npm run build            # builds the client website
```

Run the server and the client in two Git Bash windows:

```bash
npm run dev -w server    # needs server/.env with a MongoDB URI
npm run dev -w client    # needs client/.env.local with API_URL=http://localhost:5000
```

Database tests need MongoDB. Set `MONGODB_URI_TEST` to a database whose name contains `test`, then run `npm run test:integration`.

## Where things are documented

- `docs/RELEASE-v2.md`: what this release contains, what was verified, and what is still open.
- `docs/runbooks/`: what to do when something breaks in production.
- `docs/PHASE*.md`: the notes for each build phase.
