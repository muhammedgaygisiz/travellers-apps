import {
  buildCountryLabel,
  getCountryFlagEmoji,
  getCountryName,
} from '../country-label';

describe('country label helpers', () => {
  describe('getCountryName', () => {
    it('names the country in the given language', () => {
      expect(getCountryName('IT', 'de')).toBe('Italien');
      expect(getCountryName('IT', 'fr')).toBe('Italie');
      expect(getCountryName('IT', 'en')).toBe('Italy');
    });

    it('falls back to the code for a region ICU cannot name', () => {
      expect(getCountryName('XX', 'en')).toBe('XX');
    });
  });

  describe('getCountryFlagEmoji', () => {
    it('builds the flag of an alpha-2 code', () => {
      expect(getCountryFlagEmoji('IT')).toBe('🇮🇹');
    });

    it('accepts a code that was stored unnormalized', () => {
      expect(getCountryFlagEmoji(' ch ')).toBe('🇨🇭');
    });

    it('yields no flag for anything that is not an alpha-2 code', () => {
      expect(getCountryFlagEmoji('ITA')).toBe('');
      expect(getCountryFlagEmoji('')).toBe('');
      expect(getCountryFlagEmoji('1A')).toBe('');
    });
  });

  describe('buildCountryLabel', () => {
    it('puts the flag in front of the localized name', () => {
      expect(buildCountryLabel('IT', 'de')).toBe('🇮🇹 Italien');
    });

    it('leaves no gap when there is no flag to show', () => {
      expect(buildCountryLabel('ITA', 'en')).toBe('ITA');
    });
  });
});
