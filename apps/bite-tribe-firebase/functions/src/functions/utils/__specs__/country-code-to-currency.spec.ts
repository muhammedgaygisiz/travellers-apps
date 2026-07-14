import { getCurrencyByCountryCode } from '../country-code-to-currency';

describe('getCurrencyByCountryCode', () => {
  it('resolves the currency for a known country code', () => {
    expect(getCurrencyByCountryCode('IT')).toBe('EUR');
    expect(getCurrencyByCountryCode('US')).toBe('USD');
    expect(getCurrencyByCountryCode('KH')).toBe('KHR');
  });

  it('is case-insensitive', () => {
    expect(getCurrencyByCountryCode('jp')).toBe('JPY');
  });

  it('returns undefined for missing or unknown country codes', () => {
    expect(getCurrencyByCountryCode()).toBeUndefined();
    expect(getCurrencyByCountryCode('')).toBeUndefined();
    expect(getCurrencyByCountryCode('ZZ')).toBeUndefined();
  });
});
