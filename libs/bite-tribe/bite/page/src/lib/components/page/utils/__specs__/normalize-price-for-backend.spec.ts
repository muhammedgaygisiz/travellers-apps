import { normalizePriceForBackend } from '../normalize-price-for-backend';

describe(normalizePriceForBackend.name, () => {
  it('should return empty string for null or undefined or empty input', () => {
    expect(normalizePriceForBackend(null)).toBe('');
    expect(normalizePriceForBackend(undefined)).toBe('');
    expect(normalizePriceForBackend('')).toBe('');
  });

  it('should replace comma with dot in the price string', () => {
    expect(normalizePriceForBackend('12,34')).toBe('12.34');
    expect(normalizePriceForBackend('0,99')).toBe('0.99');
    expect(normalizePriceForBackend('100,00')).toBe('100.00');
  });

  it('should return the same string if there is no comma', () => {
    expect(normalizePriceForBackend('12.34')).toBe('12.34');
    expect(normalizePriceForBackend('100')).toBe('100');
    expect(normalizePriceForBackend('0')).toBe('0');
  });
});
