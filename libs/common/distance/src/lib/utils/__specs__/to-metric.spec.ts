import { describe, expect, it } from 'vitest';
import { toMetric } from '../to-metric';

describe('toMetric', () => {
  it('should return "-" for undefined input', () => {
    expect(toMetric(undefined)).toBe('-');
  });

  it('should return "-" for "NaN" input', () => {
    expect(toMetric('NaN')).toBe('-');
  });

  it('should append " km" to a valid distance string', () => {
    expect(toMetric('5')).toBe('5 km');
    expect(toMetric('10.5')).toBe('10.5 km');
    expect(toMetric('0')).toBe('0 km');
  });
});
