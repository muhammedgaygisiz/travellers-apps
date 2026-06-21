import { getLocalizedCurrencyName } from '../get-localized-currency-name';

describe('getLocalizedCurrencyName', () => {
  it('should return a localized currency name for the given language', () => {
    expect(getLocalizedCurrencyName('USD', 'de', 'US Dollar')).toBe(
      'US-Dollar',
    );
  });

  it('should fall back to the existing name when no language is available', () => {
    expect(getLocalizedCurrencyName('USD', undefined, 'US Dollar')).toBe(
      'US Dollar',
    );
  });

  it('should fall back to the currency code without language or fallback name', () => {
    expect(getLocalizedCurrencyName('USD', undefined)).toBe('USD');
  });
});
