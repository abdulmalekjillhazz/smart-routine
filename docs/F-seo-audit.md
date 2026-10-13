# F. SEO Audit and Plan (Phase 9)

Honest scope: no site can be guaranteed a top ranking. This plan makes the site as easy as possible to crawl, understand, and share. Results appear over weeks to months and must be measured in Google Search Console.

## 1. Current state (from the uploaded code)
- The whole app is client-rendered. A crawler sees little content before JavaScript runs.
- Only one root metadata block exists: title "Smart Routine" and a generic description. No per-page titles, canonical URLs, Open Graph, or Twitter tags were found.
- No sitemap.xml, robots.txt, or structured data.
- next.config.js has no security headers.
- Not verified: the html lang attribute. Check it in layout.jsx; it should be set to "bn" or "en" with a language switch.

## 2. Keyword strategy (bilingual)
Primary intent: find a daily routine planner or habit tracker, especially in Bangla.
- English: daily routine planner, habit tracker, time block planner, daily routine app
- Bangla: দৈনিক রুটিন প্ল্যানার, অভ্যাস ট্র্যাকার, দৈনিক রুটিন অ্যাপ, সময়সূচি পরিকল্পনা
Verify each term in Google Keyword Planner or Search Console before writing copy. Do not stuff keywords.

## 3. Public page map
Indexed:
- / (landing, Bangla default with /en alternative)
- /lessons (index of published lessons)
- /lessons/[slug] (one page per lesson)
- /about, /help, /privacy, /terms
Not indexed (noindex, disallowed in robots):
- /app and every signed-in screen
- /admin
- /api/*

## 4. Per-page metadata (targets)
Title: under 60 characters, primary keyword first, brand last.
Description: 140 to 160 characters, a clear reason to click.

| Page | Title (EN) | Description (EN) |
|---|---|---|
| / | Daily Routine Planner and Habit Coach \| Smart Routine | Plan your day in time blocks, track done, missed, and skipped routines, and get gentle coaching. Works in Bangla and English. |
| /lessons | Habit Lessons in Bangla and English \| Smart Routine | Short, practical lessons on routines, sleep, study, and focus, with quizzes to check what you learned. |
| /lessons/[slug] | {Lesson title} \| Smart Routine Lessons | Use the page's own summary, 140 to 160 characters, written for that lesson. |

Bangla titles follow the same pattern with native wording reviewed by a Bangla speaker. Do not machine-translate titles without review.

## 5. On-page SEO checklist
- One H1 per page, matching search intent.
- Descriptive alt text for every image (for example, a mascot reacting to progress).
- Lesson pages: clear H2 structure, vocabulary list in text (not in an image), short paragraphs.
- Internal links: landing links to lessons; each lesson links back to the app and to two related lessons.
- Canonical URL on every page. Language alternates with hreflang: bn-BD and en, plus x-default.
- Open Graph: og:title, og:description, og:image (1200 by 630), og:url, og:locale (bn_BD, en_US).
- Twitter card: summary_large_image.
- Theme color and manifest kept in sync with the golden and sapphire brand.

## 6. Structured data (JSON-LD, validated with Google's Rich Results Test)
- Organization on the home page (name, logo, url, sameAs links).
- WebApplication on the home page (name, applicationCategory, operatingSystem "Web, Android", free offer if true).
- Article or LearningResource on each lesson (headline, inLanguage, datePublished, dateModified, author).
- BreadcrumbList on lesson pages.
- FAQPage only where the questions are real and visible on the page. Google limits FAQ rich results, so do not expect a visual result.
Do not mark up reviews or ratings unless they are real and collected from users.

## 7. Technical SEO
- Server-render public pages in Next.js (static generation with revalidation for lessons). Private app pages stay client-rendered.
- sitemap.xml generated from published lessons, with accurate lastmod, and split by language.
- robots.txt: allow public pages; disallow /app, /admin, /api; link to the sitemap.
- Meta robots noindex on all private pages as a second layer.
- Canonical redirects: one host only (https://www or apex, pick one) and trailing slash rule.
- 404 page that returns a real 404 status and links back to lessons.
- Security headers in next.config.js: Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- Core Web Vitals budget on a mid-range Android over 4G: LCP under 2.5 s, INP under 200 ms, CLS under 0.1. Measure with PageSpeed Insights and CrUX data after launch.
- Images: next/image with sizes, WebP or AVIF, lazy loading below the fold.
- Fonts: Bangla font subset loaded with font-display: swap, and a system fallback.

## 8. Off-page SEO (earned, not bought)
- Google Search Console and Bing Webmaster Tools: verify the domain, submit the sitemap, watch coverage and queries weekly.
- Google Analytics or a privacy-friendly analytics tool with consent. Track sign-ups, not only visits.
- Create or verify profiles on Facebook, YouTube, and LinkedIn with the same name, logo, and link to the site.
- Publish useful Bangla content (lessons) that others will want to link to. This is the main link-building method.
- Outreach to Bangla education, productivity, and health blogs and student groups with genuine value, such as a free routine template.
- Share the lesson pages in community groups where it fits the rules.
- Avoid paid link schemes, link farms, and mass directory submissions. They can cause manual penalties.
- If the product has a physical location or local service, a Google Business Profile. Otherwise skip it.

## 9. Measurement
- Search Console: impressions, clicks, average position, and indexing errors by language.
- Weekly review: top queries, pages with impressions but low clicks (improve titles), and pages with errors.
- Monthly: Core Web Vitals report, backlinks list, and a content plan.

## 10. Acceptance tests (Phase 9)
- Every public page has a unique title, description, canonical, and hreflang.
- Rich Results Test passes for home and one lesson page with no errors.
- sitemap.xml and robots.txt load over https and match the page map.
- Private routes return noindex and are absent from the sitemap.
- Lighthouse SEO score 95 or higher on public pages; Performance meets the budget above on a throttled mobile profile.
- A Bangla speaker has reviewed every Bangla title and description.
