# Phase 4: Lessons and quizzes

## Built
- Lessons are bilingual (Bangla first) with title, body, vocabulary, and a quiz.
- Lifecycle: draft, review, published (and archived). Transitions are checked in the service and enforced by status conditions in the database, so two requests cannot both win.
- Two-person rule: the author submits, and a different person publishes. The author cannot publish their own lesson.
- Public API: GET /api/lessons (summaries) and GET /api/lessons/:slug (one published lesson). Drafts return 404.
- Answer keys never leave the server before a submission. Public output is built from an explicit allow-list, so a new field is never exposed by accident.
- Quiz attempts: POST /api/lessons/:id/attempts (login required). The server scores it and stores a LessonScore row.
- Editorial CLI: scripts/lessons.js (create, submit, publish, list). Runs on your machine with MONGODB_URI. Admin screens come in Phase 5.
- AI drafts: the aiDrafted flag is stored, but the AI drafting tool is not built. It needs the admin roles and the review screen.

## Decisions and trade-offs
1. Plan D listed the attempt route as /api/lessons/:id/attempts. The old prototype called /api/posts/:id/quiz, which never existed on the server. The web app should use the new route.
2. Scoring returns the correct answer index after submission. Learners see the answer only after they have submitted, which is the intended behaviour.
3. Lessons have no media yet. Cloudinary images and video (and their cleanup) come in Phase 5, where uploads are moderated.
4. Lesson authoring has no HTTP endpoints until Phase 5 adds admin roles. Until then, only someone with access to the database and the CLI can write lessons.
5. Learners can attempt a lesson many times. Each attempt is stored, so progress history is possible later. No attempt limit yet.
6. The public list returns the latest 50 published lessons. Pagination comes later.

## Manual checks (Git Bash)
1. Write a lesson: npm run lessons -w server -- create scripts/examples/lesson-sample.json --author YOUR_EMAIL (register that user in the app first).
2. Submit it: npm run lessons -w server -- submit morning-plan --by YOUR_EMAIL
3. Publish it with a different user: npm run lessons -w server -- publish morning-plan --by OTHER_EMAIL
4. Check the public list: curl -s http://localhost:5000/api/lessons

Note: the sample lesson's Bangla text is a draft. It needs review by a Bangla speaker before publishing to real users.

## Acceptance tests
- Shared unit tests: schema rules (answer index range, four options, slug format, unknown fields refused), quiz scoring. Pass.
- API unit tests: public output never includes the answer key, author, status, or version. Pass.
- Integration tests (tests/integration/lessons.test.js, 7 tests): drafts hidden, author cannot self-publish, only the author can submit, second person publishes, answers scored on the server, mismatched answer count refused, login required, draft lessons cannot be attempted. They need MONGODB_URI_TEST. NOT run here.

## Unverified in this sandbox
- The lesson integration tests were not run (no MongoDB).
- The CLI was not run against a database.
- The Bangla content in the sample is a draft and has not been reviewed.
