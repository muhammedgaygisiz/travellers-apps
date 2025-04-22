import { toDateString } from '../to-date-string';

describe('toDateString', () => {
  it('should format a Date object correctly', () => {
    const date = new Date(2023, 9, 15); // October 15, 2023
    expect(toDateString(date)).toBe('15.10.2023');
  });

  it('should format an object with a toDate method correctly', () => {
    const dateObject = {
      toDate: () => new Date(2023, 9, 15), // October 15, 2023
    };
    expect(toDateString(dateObject)).toBe('15.10.2023');
  });

  it('should return an empty string for null', () => {
    expect(toDateString(null)).toBe('');
  });

  it('should return an empty string for undefined', () => {
    expect(toDateString(undefined)).toBe('');
  });

  it('should return an empty string for invalid input', () => {
    expect(toDateString('invalid' as any)).toBe('');
  });

  it('should return empty string for non-Date object without toDate method', () => {
    const obj = { someProperty: 'value' };
    expect(toDateString(obj)).toBe('');
  });

  it('should return empty string when toDate property exists but is not a function', () => {
    const obj = { toDate: 'not a function' };
    expect(toDateString(obj)).toBe('');
  });
});
