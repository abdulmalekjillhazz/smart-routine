import { LANGS, absUrl, indexable, languageAlternates } from '../lib/seo.js';
import { getLessons } from '../lib/api.js';

const STATIC_PATHS = ['', '/lessons', '/about', '/help', '/privacy', '/terms'];

// Only indexable pages are listed. Each entry lists its language alternates.
export default async function sitemap() {
  const entries = [];
  const now = new Date();
  const langs = LANGS.filter((l) => indexable(l));

  for (const path of STATIC_PATHS) {
    for (const lang of langs) {
      entries.push({ url: absUrl(lang, path), lastModified: now, alternates: { languages: languageAlternates(path) } });
    }
  }
  const lessons = await getLessons();
  if (lessons.ok) {
    for (const l of lessons.lessons) {
      for (const lang of langs) {
        entries.push({
          url: absUrl(lang, `/lessons/${l.slug}`),
          lastModified: l.publishedAt ? new Date(l.publishedAt) : now,
          alternates: { languages: languageAlternates(`/lessons/${l.slug}`) },
        });
      }
    }
  }
  return entries;
}
