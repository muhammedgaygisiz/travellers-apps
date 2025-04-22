import { toDate } from '../to-date';

describe('toDate', () => {
  it('should convert a valid date string to a Date object', () => {
    const result = toDate('25.12.2023');
    expect(result).toEqual('2023-12-24T23:00:00.000Z');
  });

  it('should handle single-digit day and month correctly', () => {
    const result = toDate('5.7.2023');
    expect(result).toEqual('2023-07-04T22:00:00.000Z');
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
