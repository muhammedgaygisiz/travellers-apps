import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TimeAgoPipe } from '../time-ago.pipe';
import { vi } from 'vitest';

describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;
  const currentDate = new Date('2025-06-09T12:00:00Z');

  beforeEach(() => {
    pipe = new TimeAgoPipe();
    // Mock the current date
    vi.useFakeTimers();
    vi.setSystemTime(currentDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "1 d ago" for yesterday', () => {
    const yesterday = new Date('2025-06-08T12:00:00Z');
    expect(pipe.transform(yesterday.toISOString())).toBe('1 d ago');
  });

  it('should return "1 w ago" for a week ago', () => {
    const weekAgo = new Date('2025-06-02T12:00:00Z');
    expect(pipe.transform(weekAgo.toISOString())).toBe('1 w ago');
  });

  it('should return "1 m ago" for a month ago', () => {
    const monthAgo = new Date('2025-05-09T12:00:00Z');
    expect(pipe.transform(monthAgo.toISOString())).toBe('1 m ago');
  });

  it('should handle future dates', () => {
    const tomorrow = new Date('2025-06-10T12:00:00Z');
    expect(pipe.transform(tomorrow.toISOString())).toBe('1 d ago');
  });

  it('should handle same day (less than 24 hours)', () => {
    const sameDay = new Date('2025-06-09T06:00:00Z');
    expect(pipe.transform(sameDay.toISOString())).toBe('6 h ago');
  });

  it('should handle invalid date string', () => {
    const invalidDate = 'not-a-date';
    expect(pipe.transform(invalidDate)).toBe('NaN y ago');
  });
});
