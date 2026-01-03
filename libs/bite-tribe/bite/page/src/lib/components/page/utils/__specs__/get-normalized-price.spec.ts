import { describe, expect, it } from 'vitest';
import { getNormalizedPrice } from '../get-normalized-price';

describe('getNormalizedPrice', () => {
  it('should return empty string for null or undefined or empty input', () => {
    expect(getNormalizedPrice(null)).toBe('');
    expect(getNormalizedPrice(undefined)).toBe('');
    expect(getNormalizedPrice('')).toBe('');
  });

  it('should replace comma with dot in the price string', () => {
    expect(getNormalizedPrice('12,34')).toBe('12.34');
    expect(getNormalizedPrice('0,99')).toBe('0.99');
    expect(getNormalizedPrice('100,00')).toBe('100.00');
  });

  it('should return the same string if there is no comma', () => {
    expect(getNormalizedPrice('12.34')).toBe('12.34');
    expect(getNormalizedPrice('100')).toBe('100');
    expect(getNormalizedPrice('0')).toBe('0');
  });
});
