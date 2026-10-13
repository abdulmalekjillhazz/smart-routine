# Phase 9: Public site and SEO

## Built (client, Next.js 14, App Router)
- Public pages, server-rendered: home, lessons list, lesson page, about, help, privacy, terms. Each exists in Bangla and English under /bn and /en.
- Bangla is the default. The bare address / redirects to /bn with a permanent (308) redirect.
- Metadata on every page: title (60 characters or fewer, brand last), description (140 to 160 characters), canonical URL, hreflang alternates for bn-BD, en and x-default, Open Graph and Twitter tags, locale tags.
- Structured data (JSON-LD): Organization and WebApplication on the home page, BreadcrumbList on every page, LearningResource on each lesson. JSON is escaped so it cannot close its script tag.
- Sitemap at /sitemap.xml, generated from the API's published lessons, with hreflang alternates for each entry.
- robots.txt allows public pages, blocks /app, /admin and /api/, and links the sitemap.
- Private screens (/app): noindex, nofollow, and their own layout.
- Bangla pages are noindex and left out of the sitemap until a native speaker reviews them (set SEO_BN_INDEXABLE=true after review). The footer says the copy is a draft.
- Security headers on every page: Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- Brand colours checked against WCAG 2.2 AA: all six text pairs pass (lowest 9.7:1).
- Lesson slugs are checked before any API call. Unsafe slugs return 404.
- If the API is unreachable, pages render an honest message, and the error page is marked noindex. Nothing indexable is ever an error.
- CI: a new "seo" job builds the site, starts it, runs the SEO checks, and runs the contrast check.

## Verified here
- The production build succeeds. 18 routes are generated, including 12 static language pages and the sitemap and robots files. First-load JavaScript is 87 to 96 kB, under the 170 kB budget.
- Against the running build: 24 SEO checks pass (script: client/scripts/seo-check.mjs). They cover status codes, lang attributes, title and description lengths, canonical, hreflang, Open Graph, structured data, security headers, noindex rules, robots.txt, the sitemap, unsafe slugs, and unknown languages.
- Web unit tests (11): title and description lengths in both languages, indexing rules, hreflang coverage, JSON-LD escaping, slug safety, and the contrast pairs.
- Contrast check: all six text pairs pass.
- Lint is clean across the repository, including the web checker scripts.

## Decisions and trade-offs
1. Bangla is noindex until reviewed. This gives up search traffic in Bangla for now, so the copy should be reviewed soon.
2. The Content-Security-Policy keeps 'unsafe-inline' for scripts, because Next.js 14 inlines hydration code. Removing it needs per-request nonces, planned later.
3. Bangla text uses the system font stack, not a web font. This avoids a font download on slow connections, but Bangla rendering depends on the device. Check on a real low-end Android phone.
4. Lesson images use a plain img element, not next/image. This keeps the setup simple. Add next/image with the Cloudinary domain when image sizes are tuned.
5. The offer price is 0 BDT. This assumes the app will be free. Confirm this before launch, because it appears in structured data.
6. The /app page is a placeholder. The real app screens are the next web phase. The offline outbox UI (Phase 2), in-app reminders (Phase 3), and quiz UI are not built yet.
7. A social share image (og:image, 1200 by 630) is not included yet. Add one before launch, because social platforms show a blank card without it.

## Manual checks (Git Bash)
1. Build and start the site: npm run build -w client, then npm run start -w client
2. In a second Git Bash window, run the checks: npm run seo:check -w client
3. Open http://localhost:3000/en and view the page source. Look for the lang attribute, canonical, hreflang, and ld+json blocks.
4. After deploying to a public address, set NEXT_PUBLIC_SITE_URL to that address and rebuild, so canonical links and the sitemap are correct.

## Acceptance tests
- Sitemap and robots: verified here.
- Private routes are absent from the sitemap and carry noindex: verified here.
- SEO checks (24) and web unit tests (11): verified here.
- Rich Results Test on the home page and one lesson page: NOT run here. It needs a public URL. Paste the page address into https://search.google.com/test/rich-results after deploying.
- Lighthouse SEO score 95 or higher: NOT run here (needs Chrome). The Lighthouse step in CI is ready, see docs/PHASE8.md.

## Unverified in this sandbox
- Live lesson pages with real content: the API was not running, so lesson pages were checked only in their unavailable state. Start the API with MongoDB and publish a lesson to check the full page.
- The Rich Results Test and Lighthouse on a public URL.
- Bangla rendering on real devices.
- Search Console registration and indexing timing. Search results take weeks to appear, so measure after launch.
