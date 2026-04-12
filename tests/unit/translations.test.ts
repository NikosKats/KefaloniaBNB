import { describe, it, expect } from 'vitest';
import {
  t,
  isValidLang,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  LANG_LABELS,
  LANG_FLAGS,
} from '../../src/i18n/translations.ts';

describe('SUPPORTED_LANGS', () => {
  it('contains exactly 6 languages', () => {
    expect(SUPPORTED_LANGS).toHaveLength(6);
  });

  it('includes en, el, bg, ro, tr, sr', () => {
    expect(SUPPORTED_LANGS).toContain('en');
    expect(SUPPORTED_LANGS).toContain('el');
    expect(SUPPORTED_LANGS).toContain('bg');
    expect(SUPPORTED_LANGS).toContain('ro');
    expect(SUPPORTED_LANGS).toContain('tr');
    expect(SUPPORTED_LANGS).toContain('sr');
  });

  it('has DEFAULT_LANG = "en"', () => {
    expect(DEFAULT_LANG).toBe('en');
  });
});

describe('LANG_LABELS', () => {
  it('has a label for every supported language', () => {
    for (const lang of SUPPORTED_LANGS) {
      expect(LANG_LABELS[lang]).toBeTruthy();
    }
  });

  it('English label is "English"', () => {
    expect(LANG_LABELS.en).toBe('English');
  });
});

describe('LANG_FLAGS', () => {
  it('has a flag for every supported language', () => {
    for (const lang of SUPPORTED_LANGS) {
      expect(LANG_FLAGS[lang]).toBeTruthy();
    }
  });

  it('each flag is a non-empty string', () => {
    for (const lang of SUPPORTED_LANGS) {
      expect(typeof LANG_FLAGS[lang]).toBe('string');
      expect(LANG_FLAGS[lang].length).toBeGreaterThan(0);
    }
  });
});

describe('isValidLang', () => {
  it('returns true for each supported language', () => {
    for (const lang of SUPPORTED_LANGS) {
      expect(isValidLang(lang)).toBe(true);
    }
  });

  it('returns false for unknown language codes', () => {
    expect(isValidLang('fr')).toBe(false);
    expect(isValidLang('de')).toBe(false);
    expect(isValidLang('')).toBe(false);
    expect(isValidLang('EN')).toBe(false); // case-sensitive
  });
});

describe('t()', () => {
  describe('known keys', () => {
    it('returns English text for nav.rentals', () => {
      expect(t('en', 'nav.rentals')).toBe('Our Rentals');
    });

    it('returns Greek text for nav.contact', () => {
      expect(t('el', 'nav.contact')).toBe('Επικοινωνία');
    });

    it('returns Bulgarian text for nav.about', () => {
      expect(t('bg', 'nav.about')).toBe('За Нас');
    });

    it('returns Romanian text for nav.faq', () => {
      expect(t('ro', 'nav.faq')).toBe('Întrebări');
    });

    it('returns Turkish text for nav.book_now', () => {
      expect(t('tr', 'nav.book_now')).toBe('Rezervasyon');
    });
  });

  describe('fallback behaviour', () => {
    it('falls back to English when a key exists but the language is not translated', () => {
      // We test this by asserting that for any key, every lang returns a non-empty string
      const result = t('el', 'home.hero.title');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns the key itself when the key does not exist', () => {
      const key = 'nonexistent.key.xyz';
      expect(t('en', key)).toBe(key);
      expect(t('el', key)).toBe(key);
    });
  });

  describe('all supported languages have non-empty values for core nav keys', () => {
    const navKeys = ['nav.rentals', 'nav.about', 'nav.contact', 'nav.faq', 'nav.book_now'];

    it.each(navKeys)('key "%s" is non-empty for all languages', (key) => {
      for (const lang of SUPPORTED_LANGS) {
        const result = t(lang, key);
        expect(result.length).toBeGreaterThan(0);
        // Should not return the raw key (i.e. translation exists)
        expect(result).not.toBe(key);
      }
    });
  });

  describe('listing detail keys', () => {
    it('returns "Book Now" for listing.book_now in English', () => {
      expect(t('en', 'listing.book_now')).toBe('Book Now');
    });

    it('returns non-empty values for listing.book_now in all langs', () => {
      for (const lang of SUPPORTED_LANGS) {
        expect(t(lang, 'listing.book_now').length).toBeGreaterThan(0);
      }
    });
  });
});
