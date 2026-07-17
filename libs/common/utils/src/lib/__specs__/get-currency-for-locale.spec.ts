import { getCurrencyForLocale } from '../get-currency-for-locale';

describe('getCurrencyForLocale', () => {
  it('maps a locale with an explicit region to that region currency', () => {
    expect(getCurrencyForLocale('de-AT')).toBe('EUR');
    expect(getCurrencyForLocale('en-GB')).toBe('GBP');
    expect(getCurrencyForLocale('tr-TR')).toBe('TRY');
  });

  it('prefers the region over the language', () => {
    // A German speaker in Switzerland is paying in francs, not euros.
    expect(getCurrencyForLocale('de-CH')).toBe('CHF');
    expect(getCurrencyForLocale('en-JP')).toBe('JPY');
  });

  it('falls back to the language default region when no region is given', () => {
    expect(getCurrencyForLocale('en')).toBe('USD');
    expect(getCurrencyForLocale('de')).toBe('EUR');
    expect(getCurrencyForLocale('th')).toBe('THB');
  });

  it('accepts underscore separated and lowercase locales', () => {
    expect(getCurrencyForLocale('pt_BR')).toBe('BRL');
    expect(getCurrencyForLocale('en-us')).toBe('USD');
  });

  it('ignores script subtags when resolving the region', () => {
    expect(getCurrencyForLocale('zh-Hant-TW')).toBe('TWD');
  });

  it('falls back to EUR for unknown or missing locales', () => {
    expect(getCurrencyForLocale('')).toBe('EUR');
    expect(getCurrencyForLocale(undefined)).toBe('EUR');
    expect(getCurrencyForLocale('xx-YY')).toBe('EUR');
  });
});
