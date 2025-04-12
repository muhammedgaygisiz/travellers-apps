import { toDate } from '../to-date';

describe('toDate', () => {
  it('should convert a valid date string to a Date object', () => {
    const result = toDate('25.12.2023');
    expect(result).toEqual(new Date(2023, 11, 25)); // Months are zero-based
  });

  it('should handle single-digit day and month correctly', () => {
    const result = toDate('5.7.2023');
    expect(result).toEqual(new Date(2023, 6, 5)); // Months are zero-based
  });

  it('should throw an error for an invalid date string', () => {
    expect(() => toDate('invalid.date')).toThrow();
  });

  it('should throw an error for a date string with missing parts', () => {
    expect(() => toDate('25.12')).toThrow();
  });

  it('should throw an error for a date string with non-numeric parts', () => {
    expect(() => toDate('25.Dec.2023')).toThrow();
  });
});
