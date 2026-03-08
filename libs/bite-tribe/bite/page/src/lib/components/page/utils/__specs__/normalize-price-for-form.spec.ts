import { normalizePriceForForm } from '../normalize-price-for-form';

describe(normalizePriceForForm.name, () => {
  it('should trim whitespace from the price string', () => {
    expect(normalizePriceForForm(' 12.34 ')).toBe('12.34');
    expect(normalizePriceForForm(' 0.99 ')).toBe('0.99');
    expect(normalizePriceForForm(' 100.00 ')).toBe('100.00');
  });

  it('should return the same string if there is no whitespace', () => {
    expect(normalizePriceForForm('12.34')).toBe('12.34');
    expect(normalizePriceForForm('100')).toBe('100');
    expect(normalizePriceForForm('0')).toBe('0');
  });

  it('should return the original input if it is not a string', () => {
    // @ts-expect-error Testing non-string input
    expect(normalizePriceForForm(null)).toBe(null);
    // @ts-expect-error Testing non-string input
    expect(normalizePriceForForm(undefined)).toBe(undefined);
    // @ts-expect-error Testing non-string input
    expect(normalizePriceForForm(123)).toBe(123);
  });
});
