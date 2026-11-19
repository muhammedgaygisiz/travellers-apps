import type { PostingStreak } from 'model';
import { reachedPostingStreakMilestone } from '../posting-streak-milestone';

const streak = (weeks: number): PostingStreak => ({
  weeks,
  lastPostingWeek: '2026-11-16',
});

describe('reachedPostingStreakMilestone (issue #2149)', () => {
  it.each([
    [3, 4, 4],
    [11, 12, 12],
    [25, 26, 26],
    [51, 52, 52],
  ])('answers %i → %i with %i', (previous, current, milestone) => {
    expect(
      reachedPostingStreakMilestone(streak(previous), streak(current)),
    ).toBe(milestone);
  });

  it.each([
    [1, 2],
    [4, 5],
    [52, 53],
    [12, 12],
    [12, 1],
  ])('answers nothing for %i → %i', (previous, current) => {
    expect(
      reachedPostingStreakMilestone(streak(previous), streak(current)),
    ).toBeUndefined();
  });

  it('answers the highest milestone a jump crosses, once', () => {
    expect(reachedPostingStreakMilestone(streak(3), streak(13))).toBe(12);
  });

  it('answers nothing without a previous streak to cross from', () => {
    expect(
      reachedPostingStreakMilestone(undefined, streak(12)),
    ).toBeUndefined();
    expect(reachedPostingStreakMilestone(null, streak(4))).toBeUndefined();
  });

  it('answers nothing for a malformed streak', () => {
    expect(
      reachedPostingStreakMilestone(streak(3), { weeks: Number.NaN } as never),
    ).toBeUndefined();
  });
});
