import { roundDistance } from '../round-distance';

describe('RoundDistance', () => {
  it('should return undefined if value is undefined', () => {
    expect(roundDistance(undefined)).toBeUndefined();
  });

  it('should return the same value if value is NaN', () => {
    expect(roundDistance('NaN')).toBe('NaN');
  });

  it('should return the same value if value is less than 10', () => {
    expect(roundDistance('9.5')).toBe('9.5');
  });

  it('should return the same value if value is greater than -10', () => {
    expect(roundDistance('-9.5')).toBe('-9.5');
  });

  it('should return the rounded value if value is greater than or equal to 10', () => {
    expect(roundDistance('10.4')).toBe('10');
    expect(roundDistance('10.6')).toBe('11');
  });

  it('should return the rounded value if value is less than or equal to -10', () => {
    expect(roundDistance('-10.4')).toBe('-10');
    expect(roundDistance('-10.6')).toBe('-11');
  });
});
