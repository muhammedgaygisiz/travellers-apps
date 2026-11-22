import { DaySchedule } from '../opening-hours';
import { isOpenDay, needsOpeningTimes, openTimeRangesOf } from '../open-day';

const day = (
  isOpen: boolean,
  timeRanges: DaySchedule['timeRanges'],
): DaySchedule => ({ day: 'wednesday', isOpen, timeRanges });

/** See GitHub issue #2227. */
describe('open days', () => {
  it.each([
    ['open with a range', day(true, [{ from: '11:00', to: '22:00' }]), true],
    ['open across midnight', day(true, [{ from: '22:00', to: '02:00' }]), true],
    ['open without times', day(true, []), false],
    [
      'open with only a half range',
      day(true, [{ from: '11:00', to: '' }]),
      false,
    ],
    [
      'closed with a stale range',
      day(false, [{ from: '11:00', to: '22:00' }]),
      false,
    ],
  ])('%s is open: %s', (_, schedule, open) => {
    expect(isOpenDay(schedule)).toBe(open);
  });

  it('shows only the complete ranges of an open day', () => {
    expect(
      openTimeRangesOf(
        day(true, [
          { from: '11:00', to: '14:30' },
          { from: '18:00', to: '' },
        ]),
      ),
    ).toEqual([{ from: '11:00', to: '14:30' }]);
  });

  it.each([
    ['open without times', day(true, []), true],
    ['open with a half range', day(true, [{ from: '', to: '22:00' }]), true],
    ['open with its times', day(true, [{ from: '11:00', to: '22:00' }]), false],
    ['closed', day(false, []), false],
  ])('asks for the times of a day %s: %s', (_, schedule, needed) => {
    expect(needsOpeningTimes(schedule)).toBe(needed);
  });
});
