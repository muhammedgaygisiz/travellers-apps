import { getLocalizedCountryName } from '../get-localized-country-name';

describe('getLocalizedCountryName', () => {
  it('should return a localized country name for the given language', () => {
    expect(getLocalizedCountryName('CH', 'de', 'Switzerland')).toBe('Schweiz');
  });

  it('should fall back to the existing name when no language is available', () => {
    expect(getLocalizedCountryName('CH', undefined, 'Switzerland')).toBe(
      'Switzerland',
    );
  });

  it('should fall back to the country code without language or fallback name', () => {
    expect(getLocalizedCountryName('CH', undefined)).toBe('CH');
  });

  it('should fall back to the existing name for an unusable language tag', () => {
    expect(getLocalizedCountryName('CH', 'not a lang', 'Switzerland')).toBe(
      'Switzerland',
    );
  });
});
