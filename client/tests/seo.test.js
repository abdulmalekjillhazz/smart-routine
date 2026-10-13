import { describe, it, expect } from 'vitest';
import { DICTIONARIES } from '../i18n/dictionaries.js';
import { titleWith, makeDescription, pageMetadata, privateMetadata, jsonLd, languageAlternates, isSafeSlug, indexable } from '../lib/seo.js';
import { contrast } from '../scripts/contrast-check.mjs';
import { PALETTE, TEXT_PAIRS } from '../lib/palette.js';

const len = (s) => [...s].length;
const PAGES = ['home', 'lessons', 'about', 'help', 'privacy', 'terms'];

describe('titles and descriptions', () => {
  it('every page title is at most 60 characters, in both languages', () => {
    for (const dict of Object.values(DICTIONARIES)) {
      for (const page of PAGES) {
        expect(len(titleWith(dict[page].title)), page).toBeLessThanOrEqual(60);
      }
    }
  });

  it('every page description is 140 to 160 characters', () => {
    for (const [lang, dict] of Object.entries(DICTIONARIES)) {
      for (const page of PAGES) {
        const n = len(dict[page].description);
        expect(n, `${lang} ${page}: ${n}`).toBeGreaterThanOrEqual(140);
        expect(n, `${lang} ${page}: ${n}`).toBeLessThanOrEqual(160);
      }
    }
  });

  it('long titles are shortened and keep the brand', () => {
    const t = titleWith('A very long lesson title that goes on and on for quite a while beyond the limit');
    expect(len(t)).toBeLessThanOrEqual(60);
    expect(t.endsWith('| Smart Routine')).toBe(true);
  });

  it('long descriptions are cut to 160 characters or less', () => {
    const d = makeDescription('word '.repeat(100));
    expect(len(d)).toBeLessThanOrEqual(160);
    expect(d.endsWith('…')).toBe(true);
  });
});

describe('metadata and indexing rules', () => {
  it('Bangla pages are noindex until reviewed (default)', () => {
    expect(indexable('bn')).toBe(false);
    const m = pageMetadata({ lang: 'bn', path: '', title: 't', description: 'd' });
    expect(m.robots.index).toBe(false);
    expect(m.alternates.canonical).toMatch(/\/bn$/);
  });

  it('English pages are indexable, with hreflang alternates for both languages', () => {
    const m = pageMetadata({ lang: 'en', path: '/lessons', title: 't', description: 'd' });
    expect(m.robots.index).toBe(true);
    expect(m.alternates.languages.en).toMatch(/\/en\/lessons$/);
    expect(m.alternates.languages['bn-BD']).toMatch(/\/bn\/lessons$/);
    expect(m.alternates.languages['x-default']).toMatch(/\/bn\/lessons$/);
  });

  it('private screens are never indexed or followed', () => {
    expect(privateMetadata('x').robots).toEqual({ index: false, follow: false });
  });

  it('language alternates cover both languages and the default', () => {
    expect(Object.keys(languageAlternates(''))).toEqual(['bn-BD', 'en', 'x-default']);
  });
});

describe('structured data and safety', () => {
  it('JSON-LD escapes characters that could close the script tag', () => {
    const out = jsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<script>');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });

  it('URL slugs must be simple lowercase words', () => {
    expect(isSafeSlug('morning-plan')).toBe(true);
    expect(isSafeSlug('../secret')).toBe(false);
    expect(isSafeSlug('Upper')).toBe(false);
  });
});

describe('brand colour contrast (WCAG 2.2 AA, 4.5:1 for text)', () => {
  it('every text pair in the palette passes', () => {
    for (const [text, bg] of TEXT_PAIRS) {
      expect(contrast(PALETTE[text], PALETTE[bg]), `${text} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
