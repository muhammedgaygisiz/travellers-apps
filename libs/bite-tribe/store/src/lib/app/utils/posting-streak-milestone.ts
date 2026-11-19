import type { PostingStreak } from 'model';

/** The posting streak milestones, in weeks (epic #2034). */
export const POSTING_STREAK_MILESTONES = [4, 12, 26, 52] as const;

const weeksOf = (
  streak: PostingStreak | null | undefined,
): number | undefined =>
  typeof streak?.weeks === 'number' && Number.isFinite(streak.weeks)
    ? streak.weeks
    : undefined;

/**
 * The posting streak milestone a profile update just reached, if any (issue
 * #2149).
 *
 * One is reached when the previous snapshot's `postingStreak.weeks` is below
 * it and the current one is at or above it. An update that crosses several
 * answers the highest, so it is celebrated once. A drop, an unchanged streak
 * and a previous snapshot with no streak answer nothing: there is no baseline
 * to have crossed from, which is what keeps a first recompute of a long
 * history, or a streak reached on another device, from being celebrated.
 */
export const reachedPostingStreakMilestone = (
  previous: PostingStreak | null | undefined,
  current: PostingStreak | null | undefined,
): number | undefined => {
  const before = weeksOf(previous);
  const after = weeksOf(current);

  if (before === undefined || after === undefined || after <= before) {
    return undefined;
  }

  return [...POSTING_STREAK_MILESTONES]
    .reverse()
    .find((milestone) => before < milestone && milestone <= after);
};
