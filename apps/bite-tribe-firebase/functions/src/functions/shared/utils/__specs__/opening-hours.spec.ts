import { evaluateOpeningHours, parseTimeOfDay } from '../opening-hours';

/**
 * Whether a restaurant is open, which is one of the six rules a scanned QR code
 * is validated against (GitHub issue #1100).
 *
 * The cases that matter are the ones a naive `from <= now < to` gets wrong: a
 * kitchen serving past midnight, a guest scanning at one in the morning, and a
 * server in UTC deciding about a restaurant that is not. Each of those is a
 * closed sign in front of an open restaurant, or the reverse.
 *
 * Instants are written as explicit UTC and the schedule is evaluated in a named
 * zone, so a test never depends on where it runs.
 */
describe('opening hours', () => {
  const day = (
    name: string,
    ranges: { from: string; to: string }[],
    isOpen = true,
  ): unknown => ({ day: name, isOpen, timeRanges: ranges });

  const BERLIN = 'Europe/Berlin';

  describe('parseTimeOfDay', () => {
    it('reads a wall time as minutes since midnight', () => {
      expect(parseTimeOfDay('09:30')).toBe(570);
      expect(parseTimeOfDay('00:00')).toBe(0);
      expect(parseTimeOfDay('9:05')).toBe(545);
    });

    /**
     * `24:00` is the reason the parse is not a split. A kitchen serving until
     * midnight writes it, and `00:00` in the `to` field would read as a
     * zero-length range and close the restaurant for the whole day.
     */
    it('accepts 24:00 as the end of the day', () => {
      expect(parseTimeOfDay('24:00')).toBe(1440);
    });

    it('rejects anything that is not a wall time', () => {
      for (const value of ['', 'noon', '25:00', '12:60', '24:01', 12, null]) {
        expect(parseTimeOfDay(value)).toBeUndefined();
      }
    });
  });

  describe('evaluateOpeningHours', () => {
    /** Wednesday 2026-09-16, 12:00 in Berlin is 10:00 UTC. */
    const wednesdayNoon = new Date('2026-09-16T10:00:00Z');

    it('is open inside a range', () => {
      const schedule = [day('wednesday', [{ from: '11:30', to: '14:00' }])];

      expect(evaluateOpeningHours(schedule, BERLIN, wednesdayNoon)).toEqual({
        open: true,
      });
    });

    it('is closed before the range opens, and says when it does', () => {
      const schedule = [day('wednesday', [{ from: '18:00', to: '23:00' }])];

      expect(evaluateOpeningHours(schedule, BERLIN, wednesdayNoon)).toEqual({
        open: false,
        reopensAt: { day: 'wednesday', time: '18:00' },
      });
    });

    it('is closed between two services, and names the evening one', () => {
      const schedule = [
        day('wednesday', [
          { from: '11:30', to: '14:00' },
          { from: '18:00', to: '23:00' },
        ]),
      ];
      /** 15:00 Berlin. */
      const afternoon = new Date('2026-09-16T13:00:00Z');

      expect(evaluateOpeningHours(schedule, BERLIN, afternoon)).toEqual({
        open: false,
        reopensAt: { day: 'wednesday', time: '18:00' },
      });
    });

    it('names the next open day when today is finished', () => {
      const schedule = [
        day('wednesday', [{ from: '11:30', to: '14:00' }]),
        day('thursday', [{ from: '09:00', to: '17:00' }]),
      ];
      /** 23:00 Berlin. */
      const lateNight = new Date('2026-09-16T21:00:00Z');

      expect(evaluateOpeningHours(schedule, BERLIN, lateNight)).toEqual({
        open: false,
        reopensAt: { day: 'thursday', time: '09:00' },
      });
    });

    /**
     * The case the whole function exists for. A bar serving 22:00 to 02:00 on
     * Wednesday is open at one in the morning on Thursday, and Thursday's own
     * entry says nothing about it.
     */
    it('stays open past midnight into a day that is closed', () => {
      const schedule = [
        day('wednesday', [{ from: '22:00', to: '02:00' }]),
        day('thursday', [], false),
      ];
      /** 01:00 Berlin on Thursday. */
      const afterMidnight = new Date('2026-09-16T23:00:00Z');

      expect(evaluateOpeningHours(schedule, BERLIN, afterMidnight)).toEqual({
        open: true,
      });
    });

    it('is open after the start of an overnight range on its own day', () => {
      const schedule = [day('wednesday', [{ from: '22:00', to: '02:00' }])];
      /** 23:30 Berlin on Wednesday. */
      const lateEvening = new Date('2026-09-16T21:30:00Z');

      expect(evaluateOpeningHours(schedule, BERLIN, lateEvening)).toEqual({
        open: true,
      });
    });

    it('closes once an overnight range has run out', () => {
      const schedule = [
        day('wednesday', [{ from: '22:00', to: '02:00' }]),
        day('thursday', [], false),
      ];
      /** 03:00 Berlin on Thursday. */
      const beforeDawn = new Date('2026-09-17T01:00:00Z');

      expect(evaluateOpeningHours(schedule, BERLIN, beforeDawn)).toEqual({
        open: false,
        reopensAt: { day: 'wednesday', time: '22:00' },
      });
    });

    /** A day marked open with no ranges is open throughout. */
    it('treats an open day with no ranges as open all day', () => {
      const schedule = [day('wednesday', [])];

      expect(evaluateOpeningHours(schedule, BERLIN, wednesdayNoon)).toEqual({
        open: true,
      });
    });

    it('ignores the ranges of a day marked closed', () => {
      const schedule = [
        day('wednesday', [{ from: '11:30', to: '14:00' }], false),
        day('thursday', [{ from: '11:30', to: '14:00' }]),
      ];

      expect(evaluateOpeningHours(schedule, BERLIN, wednesdayNoon)).toEqual({
        open: false,
        reopensAt: { day: 'thursday', time: '11:30' },
      });
    });

    it('promises nothing when every day is closed', () => {
      const schedule = [day('wednesday', [], false)];

      expect(evaluateOpeningHours(schedule, BERLIN, wednesdayNoon)).toEqual({
        open: false,
      });
    });

    /**
     * The zone is the difference between a closed sign and an open one. The
     * same instant is noon in Berlin and evening in Jakarta.
     */
    it('reads the schedule in the restaurant time zone', () => {
      const schedule = [day('wednesday', [{ from: '11:00', to: '15:00' }])];

      expect(evaluateOpeningHours(schedule, BERLIN, wednesdayNoon).open).toBe(
        true,
      );
      expect(
        evaluateOpeningHours(schedule, 'Asia/Jakarta', wednesdayNoon).open,
      ).toBe(false);
    });

    /**
     * An unevaluable schedule does not close a restaurant. The `enabled` flag
     * and the staff pause are the deliberate switches; a field nobody filled in
     * is not one.
     */
    it('stays open when there is nothing to evaluate', () => {
      const schedule = [day('wednesday', [{ from: '18:00', to: '23:00' }])];

      expect(evaluateOpeningHours(undefined, BERLIN, wednesdayNoon).open).toBe(
        true,
      );
      expect(evaluateOpeningHours([], BERLIN, wednesdayNoon).open).toBe(true);
      expect(evaluateOpeningHours(schedule, '', wednesdayNoon).open).toBe(true);
      expect(
        evaluateOpeningHours(schedule, 'Mars/Olympus', wednesdayNoon).open,
      ).toBe(true);
    });

    it('drops a range it cannot read rather than the whole day', () => {
      const schedule = [
        day('wednesday', [
          { from: 'lunchtime', to: '14:00' },
          { from: '11:30', to: '14:00' },
        ]),
      ];

      expect(evaluateOpeningHours(schedule, BERLIN, wednesdayNoon)).toEqual({
        open: true,
      });
    });
  });
});
