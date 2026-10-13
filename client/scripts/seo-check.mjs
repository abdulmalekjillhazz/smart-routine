// Checks a running site for the SEO rules in docs/PHASE9.md. Exits 1 on any failure.
//   BASE_URL=http://localhost:3000 node scripts/seo-check.mjs
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  (${detail})`}`);
  if (!ok) failures.push(name);
};

async function get(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', ...options });
  return { status: res.status, headers: res.headers, text: res.status < 300 ? await res.text() : '' };
}

const meta = (html, name) => (html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`)) || [])[1];
const title = (html) => (html.match(/<title>([^<]*)<\/title>/) || [])[1];
const link = (html, rel, hreflang) =>
  (html.match(new RegExp(`<link[^>]*rel="${rel}"[^>]*${hreflang ? `hrefLang="${hreflang}"` : ''}[^>]*href="([^"]*)"`, 'i')) || [])[1];
// Each block holds one object or an array of objects. Flatten them so every item can be checked.
const ldJson = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1])].flat());

// Home: bare address goes to Bangla.
const root = await get('/');
check('bare / redirects to /bn (308)', root.status === 308 && root.headers.get('location')?.endsWith('/bn'), `status ${root.status}`);

// English home: fully indexable, with metadata and structured data.
const en = await get('/en');
check('/en returns 200', en.status === 200, `status ${en.status}`);
check('/en html lang is "en"', /<html lang="en"/.test(en.text));
check('/en has a title of at most 60 characters', (title(en.text) || '').length > 0 && title(en.text).length <= 60, title(en.text));
check('/en has a description of 140 to 160 characters', (meta(en.text, 'description') || '').length >= 140 && meta(en.text, 'description').length <= 160, `${(meta(en.text, 'description') || '').length}`);
check('/en is indexable (robots index,follow)', /index,\s*follow/.test(meta(en.text, 'robots') || ''), meta(en.text, 'robots'));
check('/en canonical points at /en', (link(en.text, 'canonical') || '').endsWith('/en'), link(en.text, 'canonical'));
check('/en has hreflang for bn-BD, en and x-default', /hrefLang="bn-BD"/.test(en.text) && /hrefLang="en"/.test(en.text) && /hrefLang="x-default"/.test(en.text));
check('/en has Open Graph title, description, url and locale', /property="og:title"/.test(en.text) && /property="og:description"/.test(en.text) && /property="og:url"/.test(en.text) && /property="og:locale"/.test(en.text));
const ld = ldJson(en.text);
check('/en has Organization and WebApplication structured data', ld.some((o) => o['@type'] === 'Organization') && ld.some((o) => o['@type'] === 'WebApplication'));
check('/en security headers present (CSP, HSTS, nosniff, frame deny)',
  /default-src 'self'/.test(en.headers.get('content-security-policy') || '') &&
  /max-age=/.test(en.headers.get('strict-transport-security') || '') &&
  en.headers.get('x-content-type-options') === 'nosniff' &&
  en.headers.get('x-frame-options') === 'DENY');

// Bangla home: present but not indexable until reviewed.
const bn = await get('/bn');
check('/bn html lang is "bn"', /<html lang="bn"/.test(bn.text));
check('/bn is noindex until Bangla copy is reviewed', /noindex/.test(meta(bn.text, 'robots') || ''), meta(bn.text, 'robots'));

// Private screen: never indexed.
const app = await get('/app');
check('/app is noindex, nofollow', /noindex/.test(meta(app.text, 'robots') || '') && /nofollow/.test(meta(app.text, 'robots') || ''), meta(app.text, 'robots'));

// Robots and sitemap.
const robots = await get('/robots.txt');
check('robots.txt disallows /app, /admin and /api/', /Disallow: \/app/.test(robots.text) && /Disallow: \/admin/.test(robots.text) && /Disallow: \/api\//.test(robots.text));
check('robots.txt links the sitemap', /Sitemap: .*\/sitemap\.xml/.test(robots.text));
const sitemap = await get('/sitemap.xml');
check('sitemap lists English pages', /\/en<\/loc>/.test(sitemap.text) && /\/en\/about<\/loc>/.test(sitemap.text));
check('sitemap does not list Bangla pages while they are noindex', !/\/bn<\/loc>/.test(sitemap.text));
check('sitemap entries carry hreflang alternates', /hreflang="bn-BD"/.test(sitemap.text) || /xhtml:link/.test(sitemap.text));

// Lessons: API offline in this check, so pages must render an honest message and never index an error.
const list = await get('/en/lessons');
check('/en/lessons renders', list.status === 200);
check('/en/lessons has breadcrumb structured data', ldJson(list.text).some((o) => o['@type'] === 'BreadcrumbList'));
const bad = await get('/en/lessons/Not_A_Slug');
check('unsafe slug returns 404', bad.status === 404, `status ${bad.status}`);
const missing = await get('/en/lessons/some-lesson');
check('lesson page with the API offline renders a message, not an indexable error', missing.status === 200 && /noindex/.test(meta(missing.text, 'robots') || ''), `status ${missing.status}`);

// Unknown language.
const unknown = await get('/fr');
check('unknown language returns 404', unknown.status === 404, `status ${unknown.status}`);

console.log(failures.length ? `\n${failures.length} check(s) failed.` : '\nAll SEO checks passed.');
process.exit(failures.length ? 1 : 0);
