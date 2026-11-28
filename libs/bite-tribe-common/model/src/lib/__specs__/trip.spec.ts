import { isTripDate, tripBiteRange } from '../trip';

describe('isTripDate', () => {
  it('accepts a calendar day written as YYYY-MM-DD', () => {
    expect(isTripDate('2026-11-28')).toBe(true);
    expect(isTripDate('2028-02-29')).toBe(true);
  });

  it.each([
    '2026-02-30',
    '2026-13-01',
    '2026-1-01',
    '26-11-28',
    '2026-11-28T00:00',
    '',
    undefined,
    20261128,
  ])('refuses %p', (value) => {
    expect(isTripDate(value)).toBe(false);
  });
});

describe('tripBiteRange', () => {
  it('runs from the start of the start date to the end of the end date', () => {
    const { fromTimestamp, toTimestamp } = tripBiteRange({
      startDate: '2026-12-01',
      endDate: '2026-12-03',
    });

    expect(fromTimestamp).toBe(new Date(2026, 11, 1).getTime());
    expect(toTimestamp).toBe(new Date(2026, 11, 4).getTime() - 1);
  });

  it('covers a one-day trip whole', () => {
    const { fromTimestamp, toTimestamp } = tripBiteRange({
      startDate: '2026-12-01',
      endDate: '2026-12-01',
    });

    expect(fromTimestamp).toBe(new Date(2026, 11, 1, 0, 0, 0, 0).getTime());
    expect(toTimestamp).toBe(new Date(2026, 11, 1, 23, 59, 59, 999).getTime());
  });

  it('has no upper bound while the trip has no end date', () => {
    expect(tripBiteRange({ startDate: '2026-12-01' })).toEqual({
      fromTimestamp: new Date(2026, 11, 1).getTime(),
    });
  });

  it('throws on a malformed date rather than querying a wrong range', () => {
    expect(() => tripBiteRange({ startDate: '2026-12-32' })).toThrow();
    expect(() =>
      tripBiteRange({ startDate: '2026-12-01', endDate: 'soon' }),
    ).toThrow();
  });
});
