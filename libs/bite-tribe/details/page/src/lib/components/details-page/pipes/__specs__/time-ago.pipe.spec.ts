import { TimeAgoPipe } from '../time-ago.pipe';

describe('TimeAgoPipe', () => {
  const pipe = new TimeAgoPipe();
  const currentDate = new Date('2025-06-09T12:00:00Z');

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  const offsetFromNow = (ms: number): string =>
    new Date(currentDate.getTime() + ms).toISOString();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(currentDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  describe('given no timestamp', () => {
    it('should render nothing for an absent value', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should render nothing for a null value', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should render nothing for an empty value', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('should render nothing for an unparsable value', () => {
      expect(pipe.transform('not-a-date')).toBe('');
    });
  });

  describe('given a past timestamp', () => {
    it.each([
      ['under a minute', -30 * 1000, 'now'],
      ['a minute', -MINUTE, '1 min. ago'],
      ['five minutes', -5 * MINUTE, '5 min. ago'],
      ['the last minute below an hour', -59 * MINUTE, '59 min. ago'],
      ['an hour', -HOUR, '1 hr. ago'],
      ['the last hour below a day', -23 * HOUR, '23 hr. ago'],
      ['a day', -DAY, 'yesterday'],
      ['the last day below a week', -6 * DAY, '6 days ago'],
      ['a week', -7 * DAY, 'last wk.'],
      ['the last week below a month', -29 * DAY, '4 wk. ago'],
      ['a month', -30 * DAY, 'last mo.'],
      ['the last month below a year', -364 * DAY, '12 mo. ago'],
      ['a year', -365 * DAY, 'last yr.'],
      ['two years', -730 * DAY, '2 yr. ago'],
    ])('should render %s as "%s"', (_, offset, expected) => {
      expect(pipe.transform(offsetFromNow(offset))).toBe(expected);
    });

    it('should not claim a unit the distance has not reached yet', () => {
      expect(pipe.transform(offsetFromNow(-89 * MINUTE))).toBe('1 hr. ago');
    });
  });

  describe('given a future timestamp', () => {
    it('should report it as ahead rather than as elapsed', () => {
      expect(pipe.transform(offsetFromNow(5 * MINUTE))).toBe('in 5 min.');
    });

    it('should report a future day as ahead', () => {
      expect(pipe.transform(offsetFromNow(DAY))).toBe('tomorrow');
    });

    it('should report a future year as ahead', () => {
      expect(pipe.transform(offsetFromNow(730 * DAY))).toBe('in 2 yr.');
    });
  });

  describe('given a language', () => {
    it.each([
      ['de', 'vor 5 Min.'],
      ['tr', '5 dk. önce'],
      ['th', '5 นาทีที่แล้ว'],
      ['fr', 'il y a 5\u00a0min'],
    ])('should render minutes in %s', (lang, expected) => {
      expect(pipe.transform(offsetFromNow(-5 * MINUTE), lang)).toBe(expected);
    });

    it('should keep minutes distinguishable from months', () => {
      const fiveMinutesAgo = pipe.transform(offsetFromNow(-5 * MINUTE), 'de');
      const fiveMonthsAgo = pipe.transform(offsetFromNow(-150 * DAY), 'de');

      expect(fiveMinutesAgo).toBe('vor 5 Min.');
      expect(fiveMonthsAgo).toBe('vor 5\u00a0Monaten');
      expect(fiveMinutesAgo).not.toBe(fiveMonthsAgo);
    });

    it('should fall back to English when no language is given', () => {
      expect(pipe.transform(offsetFromNow(-5 * MINUTE))).toBe('5 min. ago');
    });
  });
});
