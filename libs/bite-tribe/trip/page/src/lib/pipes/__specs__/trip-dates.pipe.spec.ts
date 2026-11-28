import { TripDatesPipe } from '../trip-dates.pipe';

describe(TripDatesPipe.name, () => {
  const pipe = new TripDatesPipe();

  it('formats a range in the given language', () => {
    expect(
      pipe.transform({ startDate: '2026-12-01', endDate: '2027-01-15' }, 'en'),
    ).toBe('Dec 1, 2026\u2009–\u2009Jan 15, 2027');
  });

  it('formats the start date alone while there is no end date', () => {
    expect(pipe.transform({ startDate: '2026-12-01' }, 'de')).toBe(
      '01.12.2026',
    );
  });

  it('reads the dates as calendar days, not UTC instants', () => {
    expect(pipe.transform({ startDate: '2026-01-01' }, 'en')).toBe(
      'Jan 1, 2026',
    );
  });

  it('joins two dates itself where formatRange is missing', () => {
    const formatRange = Intl.DateTimeFormat.prototype.formatRange;
    // @ts-expect-error simulating an engine without formatRange
    delete Intl.DateTimeFormat.prototype.formatRange;

    try {
      expect(
        pipe.transform(
          { startDate: '2026-12-01', endDate: '2027-01-15' },
          'en',
        ),
      ).toBe('Dec 1, 2026 – Jan 15, 2027');
    } finally {
      Intl.DateTimeFormat.prototype.formatRange = formatRange;
    }
  });
});
