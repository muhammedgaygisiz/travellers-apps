import { RoundDistancePipe } from '../round-distance.pipe';

describe('RoundDistancePipe', () => {
  const pipe = new RoundDistancePipe();

  it('should return undefined if value is undefined', () => {
    expect(pipe.transform(undefined)).toBeUndefined();
  });

  it('should return the same value if value is NaN', () => {
    expect(pipe.transform('NaN')).toBe('NaN');
  });

  it('should return the same value if value is less than 10', () => {
    expect(pipe.transform('9.5')).toBe('9.5');
  });

  it('should return the same value if value is greater than -10', () => {
    expect(pipe.transform('-9.5')).toBe('-9.5');
  });

  it('should return the rounded value if value is greater than or equal to 10', () => {
    expect(pipe.transform('10.4')).toBe('10');
    expect(pipe.transform('10.6')).toBe('11');
  });

  it('should return the rounded value if value is less than or equal to -10', () => {
    expect(pipe.transform('-10.4')).toBe('-10');
    expect(pipe.transform('-10.6')).toBe('-11');
  });
});
