import {
  isOngoingTrip,
  isTripDate,
  tripBiteRange,
  tripDateOf,
  tripDraftError,
} from '../trip';

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

describe('tripDateOf', () => {
  it('writes the local calendar day as YYYY-MM-DD', () => {
    expect(tripDateOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('isOngoingTrip', () => {
  const today = '2026-11-28';

  it('is ongoing from its start date while it has no end date', () => {
    expect(isOngoingTrip({ startDate: '2026-11-01' }, today)).toBe(true);
    expect(isOngoingTrip({ startDate: today }, today)).toBe(true);
  });

  it('is ongoing up to and including its last day', () => {
    expect(
      isOngoingTrip({ startDate: '2026-11-01', endDate: today }, today),
    ).toBe(true);
  });

  it('is not ongoing once it has ended', () => {
    expect(
      isOngoingTrip({ startDate: '2026-11-01', endDate: '2026-11-27' }, today),
    ).toBe(false);
  });

  it('is not ongoing before it starts', () => {
    expect(isOngoingTrip({ startDate: '2026-12-01' }, today)).toBe(false);
  });
});

describe('tripDraftError', () => {
  const valid = { title: 'Asia', startDate: '2026-12-01' };

  it('accepts a titled trip with a start date, with or without an end', () => {
    expect(tripDraftError(valid)).toBeUndefined();
    expect(tripDraftError({ ...valid, endDate: '2026-12-01' })).toBeUndefined();
  });

  it.each([
    [{ ...valid, title: '   ' }, 'trip-title-required'],
    [{ ...valid, title: 'x'.repeat(101) }, 'trip-title-too-long'],
    [{ ...valid, startDate: '' }, 'trip-start-date-required'],
    [{ ...valid, endDate: '2026-11-30' }, 'trip-end-before-start'],
  ])('refuses %p with %s', (draft, error) => {
    expect(tripDraftError(draft)).toBe(error);
  });
});
