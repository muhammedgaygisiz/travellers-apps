import { Preferences } from '@capacitor/preferences';
import type { WeeklyLeaderboardSnapshot } from 'bite-tribe/api';
import {
  CELEBRATED_TOP_TEN_KEY_PREFIX,
  claimTopTenWeek,
  enteredTopTen,
} from '../entered-top-ten';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));

const WEEK = '2026-11-09';
const ME = 'leela';

/** A board of `week` listing `counts` as users `u1`, `u2`, ... in order. */
const board = (
  counts: number[],
  extra: { at?: number; me?: number } = {},
  week = WEEK,
): WeeklyLeaderboardSnapshot => {
  const users = counts.map((biteCount, index) => ({
    userId: `u${index + 1}`,
    displayName: `User ${index + 1}`,
    biteCount,
  }));

  if (extra.at !== undefined && extra.me !== undefined) {
    users.splice(extra.at - 1, 0, {
      userId: ME,
      displayName: 'Leela',
      biteCount: extra.me,
    });
  }

  return { week, users: users.slice(0, 10) };
};

describe('enteredTopTen', () => {
  it('answers the rank a Bite of the user’s own took them in at', () => {
    const previous = board([9, 8, 7, 6, 5, 4, 3, 3, 3, 3]);
    const current = board([9, 8, 7, 6, 5, 4], { at: 7, me: 4 });

    expect(enteredTopTen(previous, current, ME)).toBe(7);
  });

  it('answers nothing when the user is listed without their count having risen', () => {
    // u1 deleted their account; the user moves up into the freed place with
    // the 3 Bites they already had.
    const previous = board([9, 8, 7, 6, 5, 4, 3, 3, 3, 3]);
    const current = board([8, 7, 6, 5, 4, 3, 3, 3, 3], { at: 10, me: 3 });

    expect(enteredTopTen(previous, current, ME)).toBeUndefined();
  });

  it('answers the rank on a board with places left, where an unlisted user had none', () => {
    const previous = board([3, 2]);
    const current = board([3, 2], { at: 3, me: 1 });

    expect(enteredTopTen(previous, current, ME)).toBe(3);
  });

  it('answers the rank for the first Bite of a new week', () => {
    const previous = board([5, 4, 3], { at: 2, me: 4 }, '2026-11-02');
    const current = board([], { at: 1, me: 1 });

    expect(enteredTopTen(previous, current, ME)).toBe(1);
  });

  it('answers nothing for a user who stays in the top ten', () => {
    const previous = board([9, 8, 7], { at: 4, me: 5 });
    const current = board([9, 8], { at: 3, me: 8 });

    expect(enteredTopTen(previous, current, ME)).toBeUndefined();
  });

  it('answers nothing for a user who drops out', () => {
    const previous = board([9, 8, 7, 6, 5, 4, 3, 3, 3], { at: 10, me: 3 });
    const current = board([9, 8, 7, 6, 5, 4, 4, 3, 3, 3]);

    expect(enteredTopTen(previous, current, ME)).toBeUndefined();
  });

  it('answers nothing for a user the board does not list', () => {
    expect(enteredTopTen(board([3]), board([4]), ME)).toBeUndefined();
  });
});

describe('claimTopTenWeek', () => {
  const key = `${CELEBRATED_TOP_TEN_KEY_PREFIX}${ME}`;

  beforeEach(() => {
    jest.mocked(Preferences.get).mockReset();
    jest.mocked(Preferences.set).mockReset().mockResolvedValue(undefined);
  });

  it('claims a week not celebrated yet and remembers it', async () => {
    jest.mocked(Preferences.get).mockResolvedValue({ value: '2026-11-02' });

    await expect(claimTopTenWeek(ME, WEEK)).resolves.toBe(true);
    expect(Preferences.get).toHaveBeenCalledWith({ key });
    expect(Preferences.set).toHaveBeenCalledWith({ key, value: WEEK });
  });

  it('refuses a week already celebrated', async () => {
    jest.mocked(Preferences.get).mockResolvedValue({ value: WEEK });

    await expect(claimTopTenWeek(ME, WEEK)).resolves.toBe(false);
    expect(Preferences.set).not.toHaveBeenCalled();
  });

  it('still celebrates when the storage fails', async () => {
    jest.mocked(Preferences.get).mockRejectedValue(new Error('unavailable'));

    await expect(claimTopTenWeek(ME, WEEK)).resolves.toBe(true);
  });
});
