import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toDate } from '../to-date';

describe('toDate', () => {
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle date strings', () => {
    const dateStr = '2024-03-15T12:00:00Z';
    const result = toDate(dateStr);
    expect(result).toEqual(new Date(dateStr));
  });

  it('should handle firebase timestamp-like objects', () => {
    const mockTimestamp = {
      toDate: (): Date => new Date('2024-03-15T12:00:00Z'),
    };
    const result = toDate(mockTimestamp);
    expect(result).toEqual(new Date('2024-03-15T12:00:00Z'));
  });

  it('should handle Date objects', () => {
    const date = new Date('2024-03-15T12:00:00Z');
    const result = toDate(date);
    expect(result).toEqual(date);
  });

  it('should handle ISO string', () => {
    const isoString = '2024-03-15T12:00:00.000Z';
    const result = toDate(isoString);
    expect(result).toEqual(new Date(isoString));
  });
});
