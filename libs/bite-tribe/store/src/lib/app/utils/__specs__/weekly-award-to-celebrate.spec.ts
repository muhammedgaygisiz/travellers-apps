import { Preferences } from '@capacitor/preferences';
import type { WeeklyBadge } from 'model';
import {
  bestWeeklyBadge,
  weeklyAwardToCelebrate,
} from '../weekly-award-to-celebrate';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));

const WEEK = '2026-11-09';
const bites = (place: number): WeeklyBadge => ({
  board: 'thisWeek',
  place,
  week: WEEK,
});
const liked = (place: number): WeeklyBadge => ({
  board: 'mostLiked',
  place,
  week: WEEK,
});

describe('bestWeeklyBadge', () => {
  it('names the better place, and This week on a tie', () => {
    expect(bestWeeklyBadge([bites(2), liked(1)])).toEqual(liked(1));
    expect(bestWeeklyBadge([liked(2), bites(2)])).toEqual(bites(2));
    expect(bestWeeklyBadge(undefined)).toBeUndefined();
  });
});

describe('weeklyAwardToCelebrate', () => {
  beforeEach(() => {
    jest.mocked(Preferences.get).mockReset();
    jest.mocked(Preferences.set).mockReset();
  });

  it('celebrates a won week once on this device and remembers it', async () => {
    jest.mocked(Preferences.get).mockResolvedValue({ value: '2026-11-02' });

    const badge = await weeklyAwardToCelebrate({
      userId: 'ana',
      weeklyBadges: [bites(1)],
    });

    expect(badge).toEqual(bites(1));
    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'weekly-award-celebrated:ana',
      value: WEEK,
    });
  });

  it('does not celebrate the same week twice', async () => {
    jest.mocked(Preferences.get).mockResolvedValue({ value: WEEK });

    expect(
      await weeklyAwardToCelebrate({ userId: 'ana', weeklyBadges: [bites(1)] }),
    ).toBeUndefined();
    expect(Preferences.set).not.toHaveBeenCalled();
  });

  it('celebrates nothing without a badge', async () => {
    expect(
      await weeklyAwardToCelebrate({ userId: 'ana', weeklyBadges: [] }),
    ).toBeUndefined();
    expect(Preferences.get).not.toHaveBeenCalled();
  });
});
