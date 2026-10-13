import { describe, it, expect } from 'vitest';
import { DICTIONARIES } from '../i18n/dictionaries.js';

const FOOTER_KEYS = ['note', 'privacy', 'terms', 'help', 'draftNotice'];
const NAV_KEYS = ['label', 'home', 'lessons', 'about', 'help', 'app', 'menu', 'close'];
const BANGLA_LETTERS = /[\u0980-\u09FF]/;

describe('footer and navigation copy', () => {
  it('every footer key exists and is not empty in both languages', () => {
    for (const [lang, dict] of Object.entries(DICTIONARIES)) {
      for (const key of FOOTER_KEYS) {
        expect(dict.footer[key], `${lang} footer.${key}`).toBeTruthy();
      }
    }
  });

  it('every navigation key exists and is not empty in both languages', () => {
    for (const [lang, dict] of Object.entries(DICTIONARIES)) {
      for (const key of NAV_KEYS) {
        expect(dict.nav[key], `${lang} nav.${key}`).toBeTruthy();
      }
    }
  });

  it('the Bangla draft notice is written in Bangla, not English', () => {
    expect(BANGLA_LETTERS.test(DICTIONARIES.bn.footer.draftNotice)).toBe(true);
  });

  it('the English page has no draft notice, because English is reviewed', () => {
    expect(DICTIONARIES.en.draft).toBe(false);
  });
});
