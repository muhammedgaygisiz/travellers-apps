import { toDate } from '../to-date';

describe('toDate', () => {
  it('should convert a valid date string to a Date object', () => {
    const result = toDate('25.12.2023');
    expect(result).toBe('2023-12-25T00:00:00.000Z');
  });

  it('should handle single-digit day and month correctly', () => {
    const result = toDate('5.7.2023');
    expect(result).toBe('2023-07-05T00:00:00.000Z');
  });

  it('should throw an error for an invalid date string', () => {
    expect(() => toDate('invalid.date')).toThrow(
      'Invalid date format. Expected format: dd.MM.yyyy'
    );
  });

  it('should throw an error for a date string with missing parts', () => {
    expect(() => toDate('25.12')).toThrow(
      'Invalid date format. Expected format: dd.MM.yyyy'
    );
  });

  it('should throw an error for a date string with non-numeric parts', () => {
    expect(() => toDate('25.Dec.2023')).toThrow(
      'Invalid date format. Expected format: dd.MM.yyyy'
    );
  });
});
